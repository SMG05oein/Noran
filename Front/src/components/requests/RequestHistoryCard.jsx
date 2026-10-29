import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { format, addDays, parseISO, getDay } from 'date-fns';
import { isHoliday } from 'holiday-kr';
import { RiEyeLine } from 'react-icons/ri';
import {
  DAY_LABELS,
  isPublicAssignment,
  isBlankStatus,
  isWorkerHiddenStatus,
  toDateStr,
  displayOpenTime
} from './requestsUtils';

const RequestHistoryCard = ({
  monDate,
  weekSchs,
  reqDate,
  setViewingRequest,
  handleOpenEdit,
  setSelectedCellDetail,
  editButtonText
}) => {
  const weekEnd = addDays(parseISO(monDate), 6);
  const uniqueApplyDates = new Set(weekSchs.map(s => toDateStr(s.date)));
  const assignedDaysCount = new Set(weekSchs.filter(isPublicAssignment).map(s => toDateStr(s.date))).size;
  const pendingDaysCount = new Set(
    weekSchs
      .filter(s => s.wsdStatus === '신청' && !isPublicAssignment(s))
      .map(s => toDateStr(s.date))
  ).size;
  const isWeekPartial = assignedDaysCount > 0 && pendingDaysCount > 0;
  const isWeekConfirmed = assignedDaysCount > 0 && pendingDaysCount === 0;

  const weekCells = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(parseISO(monDate), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const slots = weekSchs.filter(s => {
      const st = s.wsdStatus;
      return toDateStr(s.date) === dateStr && !isBlankStatus(st) && !isWorkerHiddenStatus(st);
    });
    return { date, dateStr, slots };
  });

  return (
    <Card className="req-history-card">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
          <div>
            <div className="req-history-range">
              {format(parseISO(monDate), 'M/d')} – {format(weekEnd, 'M/d')}
            </div>
            <div className="req-history-meta mt-1">
              신청 {uniqueApplyDates.size}일
              {isWeekPartial
                ? ` · 임시 배정 (출근 ${assignedDaysCount}일 · 대기 ${pendingDaysCount}일)`
                : isWeekConfirmed
                ? ` · 출근 ${assignedDaysCount}일`
                : ' · 출근 대기'}
            </div>
          </div>
          <div className="d-flex gap-2 flex-shrink-0">
            <Button variant="light" className="req-icon-btn p-2" onClick={() => setViewingRequest({ monDate, weekSchs })} aria-label="상세보기">
              <RiEyeLine size={20} />
            </Button>
            {!weekSchs.some(isPublicAssignment) && monDate >= reqDate && (
              <Button variant="outline-warning" size="sm" className="fw-bold px-3" onClick={() => handleOpenEdit(monDate, weekSchs)}>
                {editButtonText || '수정'}
              </Button>
            )}
          </div>
        </div>

        {/* 한 주 7칸 압축 표 */}
        <div className="req-compact-table-container">
          <div className="req-compact-grid">
            {/* 헤더 행 (Corner + 월~일 7칸) */}
            <div className="req-grid-cell req-grid-corner" />
            {weekCells.map(({ date, dateStr }) => {
              const dayNum = getDay(date);
              const isHoly = isHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate()) || dayNum === 0;
              const isSat = dayNum === 6 && !isHoly;
              return (
                <div key={`h-${dateStr}`} className="req-grid-cell req-grid-header">
                  <div className={`req-grid-day-name ${isHoly ? 'text-danger' : isSat ? 'text-primary' : ''}`}>
                    {DAY_LABELS[dayNum]}
                  </div>
                  <div className="req-grid-day-date">{format(date, 'd')}</div>
                </div>
              );
            })}

            {/* 1행: 신청 */}
            <div className="req-grid-cell req-grid-label">신청</div>
            {weekCells.map(({ date, dateStr, slots }) => {
              const appliedSlot = slots.find(s => {
                if (isBlankStatus(s.wsdStatus)) return false;
                if (s.isSelfApplied === false || s.selfApplied === false) return false;
                return true;
              });
              const isOpen = appliedSlot && (appliedSlot.openApplied === true || appliedSlot.isOpen === true || appliedSlot.wsdIsOpen === true || appliedSlot.wsdStartTime === '오픈');
              const isApplied = !!appliedSlot;
              const chipClass = isApplied ? (isOpen ? 'cell-open' : 'cell-applied') : 'cell-unapplied';
              const text = isApplied ? (isOpen ? '오픈' : '신청') : '–';

              return (
                <button
                  key={`app-${dateStr}`}
                  type="button"
                  className={`req-grid-cell req-data-cell ${chipClass}`}
                  onClick={() => setSelectedCellDetail({
                    date,
                    type: 'APPLY',
                    slot: appliedSlot,
                    label: isApplied ? (isOpen ? '오픈 근무 신청' : '일반 근무 신청') : '신청 내역 없음'
                  })}
                  aria-label={`${format(date, 'M월 d일')} 신청 내역: ${text}`}
                >
                  {text}
                </button>
              );
            })}

            {/* 2행: 출근 */}
            <div className="req-grid-cell req-grid-label">출근</div>
            {weekCells.map(({ date, dateStr, slots }) => {
              const assignedSlot = slots.find(s => isPublicAssignment(s));
              const didApply = slots.some(s => {
                if (isBlankStatus(s.wsdStatus)) return false;
                if (s.isSelfApplied === false || s.selfApplied === false) return false;
                return true;
              });
              const isConfirmed = weekSchs.some(isPublicAssignment);

              let text = '–';
              let chipClass = 'cell-unapplied';
              let detailLabel = '배정 내역 없음';

              if (assignedSlot) {
                text = displayOpenTime(assignedSlot, date).split(' ')[0] || '출근';
                chipClass = 'cell-work';
                detailLabel = `${displayOpenTime(assignedSlot, date)} (${assignedSlot.wsdWorkPlaceName || '소속지점'})`;
              } else if (isConfirmed) {
                text = '–';
                chipClass = 'cell-unapplied';
                detailLabel = didApply ? '근무 미배정' : '배정 내역 없음';
              } else if (didApply) {
                text = '신청';
                chipClass = 'cell-pending';
                detailLabel = '신청 완료 (배정 대기)';
              }

              return (
                <button
                  key={`assign-${dateStr}`}
                  type="button"
                  className={`req-grid-cell req-data-cell ${chipClass}`}
                  onClick={() => setSelectedCellDetail({
                    date,
                    type: 'ASSIGN',
                    slot: assignedSlot || slots[0],
                    label: detailLabel
                  })}
                  aria-label={`${format(date, 'M월 d일')} 배정 결과: ${text}`}
                >
                  {text}
                </button>
              );
            })}
          </div>

          {/* 표 하단 색상 범례 */}
          <div className="req-table-legend d-flex align-items-center justify-content-center gap-3 mt-2 flex-wrap">
            <span className="req-legend-item"><span className="legend-dot dot-pending" /> 신청</span>
            <span className="req-legend-item"><span className="legend-dot dot-work" /> 출근 시간</span>
            <span className="req-legend-item"><span className="legend-dot dot-unapplied">–</span> 미신청</span>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default RequestHistoryCard;

