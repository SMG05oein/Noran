import React from 'react';
import { Form, Dropdown, ButtonGroup } from 'react-bootstrap';
import { addDays, format, getDay } from 'date-fns';
import { isHoliday } from 'holiday-kr';
import {
  DAY_LABELS,
  DAYS_ORDER,
  isPublicAssignment,
  isBlankStatus,
  toDateStr,
  displayOpenTime,
  isUserAppliedShift
} from './requestsUtils';

export const BatchApplyBar = ({ onBatch }) => (
  <div className="req-batch-bar d-flex align-items-center gap-1 mb-2 flex-wrap">
    <span className="small text-muted fw-bold me-1" style={{ fontSize: '0.8rem' }}>일괄:</span>
    <Dropdown as={ButtonGroup} size="sm">
      <Dropdown.Toggle variant="outline-secondary" className="req-batch-toggle">
        모두
      </Dropdown.Toggle>
      <Dropdown.Menu className="req-batch-menu">
        <Dropdown.Item onClick={() => onBatch('ALL', 'NORMAL')}>전체 신청 (월~일)</Dropdown.Item>
        <Dropdown.Item onClick={() => onBatch('ALL', 'OPEN')}>전체 오픈 (월~일)</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item onClick={() => onBatch('ALL', 'CLEAR')} className="text-danger">전체 해제</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>

    <Dropdown as={ButtonGroup} size="sm">
      <Dropdown.Toggle variant="outline-secondary" className="req-batch-toggle">
        평일
      </Dropdown.Toggle>
      <Dropdown.Menu className="req-batch-menu">
        <Dropdown.Item onClick={() => onBatch('WEEKDAY', 'NORMAL')}>평일 신청 (월~금)</Dropdown.Item>
        <Dropdown.Item onClick={() => onBatch('WEEKDAY', 'OPEN')}>평일 오픈 (월~금)</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item onClick={() => onBatch('WEEKDAY', 'CLEAR')} className="text-danger">평일 해제</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>

    <Dropdown as={ButtonGroup} size="sm">
      <Dropdown.Toggle variant="outline-secondary" className="req-batch-toggle">
        주말
      </Dropdown.Toggle>
      <Dropdown.Menu className="req-batch-menu">
        <Dropdown.Item onClick={() => onBatch('WEEKEND', 'NORMAL')}>주말 신청 (토·일)</Dropdown.Item>
        <Dropdown.Item onClick={() => onBatch('WEEKEND', 'OPEN')}>주말 오픈 (토·일)</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item onClick={() => onBatch('WEEKEND', 'CLEAR')} className="text-danger">주말 해제</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>

    <button
      type="button"
      className="btn btn-sm btn-outline-danger ms-auto req-batch-reset-btn"
      onClick={() => onBatch('ALL', 'CLEAR')}
      title="모든 요일 선택 해제"
    >
      초기화
    </button>
  </div>
);

export const PlaceChipSelect = ({ workPlaces, value, onChange }) => (
  <div className="req-place-chip-wrapper">
    <select
      className="req-place-select-chip"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      aria-label="근무지 선택"
    >
      {workPlaces.length === 0 && <option value="">지점 불러오는 중…</option>}
      {workPlaces.map(wp => (
        <option key={wp.wpIdx} value={wp.wpIdx}>{wp.wpName}</option>
      ))}
    </select>
  </div>
);

export const PlaceSelect = ({ workPlaces, value, onChange }) => (
  <Form.Group className="mb-3">
    <Form.Label className="fw-bold text-muted small mb-1">근무지</Form.Label>
    <Form.Select
      className="custom-input"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {workPlaces.length === 0 && <option value="">지점 불러오는 중…</option>}
      {workPlaces.map(wp => (
        <option key={wp.wpIdx} value={wp.wpIdx}>{wp.wpName}</option>
      ))}
    </Form.Select>
  </Form.Group>
);

export const ApplyWeekList = ({
  monday,
  block,
  onToggleType,
  weekSchs = [],
  onCellDetailClick,
  disabled = false
}) => {
  if (!block) return null;

  const daysData = DAYS_ORDER.map((day, i) => {
    const date = addDays(monday, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayNum = getDay(date);
    const isHoly = isHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate()) || dayNum === 0;
    const isSat = dayNum === 6 && !isHoly;
    const applied = !!block.days[day];
    const isOpen = applied && !!block.openShift[day];
    const isNormal = applied && !isOpen;

    // Assignment status for 3rd row
    const slots = (weekSchs || []).filter(s => {
      const st = s.wsdStatus;
      return toDateStr(s.date) === dateStr && !isBlankStatus(st);
    });

    const assignedSlot = slots.find(s => isPublicAssignment(s));
    const didApply = applied || slots.some(isUserAppliedShift);
    const hasPendingSlot = slots.some(s => s.wsdStatus === '신청');
    const hasOffSlot = slots.some(s => s.wsdStatus === '미출근' || s.wsdStatus === '미배정');
    const isConfirmedWeek = (weekSchs || []).some(s => isPublicAssignment(s));
    const isRejected = !assignedSlot && (hasOffSlot || (isConfirmedWeek && didApply && !hasPendingSlot));
    const isPending = !assignedSlot && !isRejected && (hasPendingSlot || slots.some(s => s.wsdIsConfirmed !== true) || (slots.length === 0 && applied));

    let assignText = '–';
    let assignClass = 'cell-unapplied';
    let assignLabel = '배정 내역 없음';

    if (assignedSlot) {
      assignText = displayOpenTime(assignedSlot, date).split(' ')[0] || '출근';
      assignClass = 'cell-work';
      assignLabel = `${displayOpenTime(assignedSlot, date)} (${assignedSlot.wsdWorkPlaceName || '소속지점'})`;
    } else if (didApply && (isPending || slots.length > 0)) {
      assignText = '대기';
      assignClass = 'cell-pending';
      assignLabel = '배정 대기 중 (관리자 승인 대기)';
    } else if (isRejected) {
      assignText = '미배정';
      assignClass = 'cell-rejected';
      assignLabel = '미배정 (근무 미배정 처리됨)';
    }

    return {
      day,
      date,
      dateStr,
      dayNum,
      dayLabel: DAY_LABELS[dayNum],
      dayFormatted: format(date, 'd'),
      isHoly,
      isSat,
      isNormal,
      isOpen,
      assignText,
      assignClass,
      assignLabel,
      assignedSlot: assignedSlot || slots[0]
    };
  });

  return (
    <div className="req-grid-container mb-3">
      {/* 요일 헤더: 7개 요일 카드 */}
      <div className="req-grid-row req-grid-header-row">
        {daysData.map(d => (
          <div key={d.day} className="req-grid-day-card">
            <div className={`req-grid-day-name ${d.isHoly ? 'is-holy' : d.isSat ? 'is-sat' : ''}`}>
              {d.dayLabel}
            </div>
            <div className="req-grid-day-num">
              {d.dayFormatted}
            </div>
          </div>
        ))}
      </div>

      {/* 1행: 신청 (일반 근무) */}
      <div className="req-grid-row req-grid-data-row">
        {daysData.map(d => (
          <button
            key={d.day}
            type="button"
            disabled={disabled}
            className={`req-grid-btn btn-normal ${d.isNormal ? 'is-active' : ''}`}
            onClick={() => onToggleType(d.day, 'NORMAL')}
            aria-label={`${d.dayLabel}요일 ${d.dayFormatted}일 일반 신청`}
            aria-pressed={d.isNormal}
            title={`${d.dayLabel}요일 일반 신청`}
          >
            신청
          </button>
        ))}
      </div>

      {/* 2행: 오픈 (오픈 근무) */}
      <div className="req-grid-row req-grid-data-row">
        {daysData.map(d => (
          <button
            key={d.day}
            type="button"
            disabled={disabled}
            className={`req-grid-btn btn-open ${d.isOpen ? 'is-active' : ''}`}
            onClick={() => onToggleType(d.day, 'OPEN')}
            aria-label={`${d.dayLabel}요일 ${d.dayFormatted}일 오픈 신청`}
            aria-pressed={d.isOpen}
            title={`${d.dayLabel}요일 오픈 신청`}
          >
            오픈
          </button>
        ))}
      </div>

      {/* 3행: 배정 결과 */}
      <div className="req-grid-row req-grid-data-row req-grid-assign-row mt-1">
        {daysData.map(d => (
          <button
            key={d.day}
            type="button"
            className={`req-grid-btn req-assign-cell req-data-cell ${d.assignClass}`}
            onClick={() => onCellDetailClick && onCellDetailClick({
              date: d.date,
              type: 'ASSIGN',
              slot: d.assignedSlot,
              label: d.assignLabel
            })}
            aria-label={`${d.dayLabel}요일 배정 결과: ${d.assignText}`}
            title={`${d.dayLabel}요일 배정 결과: ${d.assignText}`}
          >
            {d.assignText}
          </button>
        ))}
      </div>

      {/* 배정 상태 범례 */}
      <div className="req-table-legend d-flex align-items-center justify-content-center gap-3 mt-2 flex-wrap">
        <span className="req-legend-item"><span className="legend-dot dot-pending" /> 신청/대기</span>
        <span className="req-legend-item"><span className="legend-dot dot-work" /> 배정 완료</span>
        <span className="req-legend-item"><span className="legend-dot dot-rejected" /> 미배정</span>
        <span className="req-legend-item"><span className="legend-dot dot-unapplied">–</span> 미신청</span>
      </div>
    </div>
  );
};

export const ApplyWeekGrid = ({
  monday,
  block,
  onToggleType,
  weekSchs,
  onCellDetailClick,
  disabled
}) => (
  <ApplyWeekList
    monday={monday}
    block={block}
    onToggleType={onToggleType}
    weekSchs={weekSchs}
    onCellDetailClick={onCellDetailClick}
    disabled={disabled}
  />
);

