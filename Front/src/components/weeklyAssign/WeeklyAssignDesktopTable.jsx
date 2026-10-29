import React, { useRef, useState, useEffect } from 'react';
import { Badge, Button, Form } from 'react-bootstrap';
import { format, getDay } from 'date-fns';
import { RiCloseLine, RiRefreshLine } from 'react-icons/ri';
import AssignTimeInput from '../AssignTimeInput';
import { toUserIdx, createEmptyShift, displayShiftStatus, getShiftTone, canResetShift, dayMeta } from './weeklyAssignUtils';
import { openStartTimeForDate } from '../../utils/shiftReset';

export const RemarkCell = ({ text, userName, onOpen }) => {
  const contentRef = useRef(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    if (!text) {
      setHasOverflow(false);
      return;
    }
    const el = contentRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setHasOverflow(el.scrollHeight > el.clientHeight + 2);
    };
    checkOverflow();

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(checkOverflow);
      resizeObserver.observe(el);
    }
    window.addEventListener('resize', checkOverflow);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  if (!text) {
    return <span className="text-muted text-center d-block">-</span>;
  }

  return (
    <div
      className={`wat-remark-box ${hasOverflow ? 'is-overflow' : ''}`}
      onClick={hasOverflow ? () => onOpen(userName, text) : undefined}
      title={hasOverflow ? '클릭하여 전체 비고 보기' : text}
      role={hasOverflow ? 'button' : undefined}
      tabIndex={hasOverflow ? 0 : undefined}
      onKeyDown={hasOverflow ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(userName, text);
        }
      } : undefined}
    >
      <div ref={contentRef} className="wat-remark-text">
        {text}
      </div>
      {hasOverflow && (
        <span className="wat-remark-corner-mark" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="2.5" y1="8.5" x2="8.5" y2="2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="6" y1="9" x2="9" y2="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </div>
  );
};

const WeeklyAssignDesktopTable = ({
  weekDays,
  renderUsers,
  schedules,
  editSchedules,
  currentWorkPlaceIdx,
  peakByDate,
  appliedCountByDate,
  totalByDate,
  dayFilter,
  isOtherBranchWorker,
  isOnLeave,
  renderRowBulkInput,
  handleRemoveOtherWorker,
  handleUpdateShift,
  handleRemoveShift,
  onOpenRemarkModal
}) => {
  const renderShiftBlock = (uid, dateStr, shift) => {
    const openHint = !!shift.originOpenApplied && !shift.wsdIsOpen;

    return (
      <div key={shift._id} className="wat-shift">
        <div className="wat-shift-top d-flex align-items-center justify-content-between" data-html2canvas-ignore="true">
          <div className="d-flex align-items-center gap-2">
            <Form.Check
              type="checkbox"
              id={`open-${shift._id}`}
              checked={!!shift.wsdIsOpen}
              onChange={(e) => {
                const checked = e.target.checked;
                handleUpdateShift(uid, dateStr, shift._id, {
                  wsdIsOpen: checked,
                  ...(checked ? {
                    wsdStatus: '출근',
                    wsdStartTime: shift.wsdStartTime || openStartTimeForDate(dateStr)
                  } : {})
                });
              }}
              label="오픈"
              title={openHint ? '오픈으로 신청됨 — 체크하면 오픈 출근' : undefined}
              className={`wat-open-check ${shift.wsdIsOpen ? 'is-on' : ''} ${openHint ? 'is-hint' : ''}`}
            />
            <Form.Check
              type="checkbox"
              id={`close-${shift._id}`}
              checked={!!shift.wsdIsClose}
              onChange={(e) => {
                const checked = e.target.checked;
                handleUpdateShift(uid, dateStr, shift._id, {
                  wsdIsClose: checked,
                  ...(checked ? { wsdStatus: '출근' } : {})
                });
              }}
              label="마감"
              className={`wat-close-check ${shift.wsdIsClose ? 'is-on' : ''}`}
            />
          </div>
          {canResetShift(shift) && (
            <Button
              variant="link"
              size="sm"
              className="wat-icon-btn p-0 text-muted ms-auto"
              title="되돌리기"
              aria-label="되돌리기"
              onClick={() => handleRemoveShift(uid, dateStr, shift._id)}
            >
              <RiRefreshLine size={13} />
            </Button>
          )}
        </div>
        <AssignTimeInput
          value={shift.wsdStartTime || ''}
          placeholder={displayShiftStatus(shift)}
          className={`wat-shift-input assign-status-input ${getShiftTone(shift)}`}
          onPick={(val) => {
            if (val === '미출근') {
              handleUpdateShift(uid, dateStr, shift._id, {
                wsdStartTime: '',
                wsdStatus: '미출근',
                wsdIsOpen: false,
                wsdIsClose: false
              });
            } else if (val === '오픈') {
              handleUpdateShift(uid, dateStr, shift._id, {
                wsdStartTime: openStartTimeForDate(dateStr),
                wsdStatus: '출근',
                wsdIsOpen: true
              });
            } else if (!val) {
              handleUpdateShift(uid, dateStr, shift._id, {
                wsdStartTime: '',
                wsdStatus: null,
                wsdIsOpen: false,
                wsdIsClose: false
              });
            } else {
              handleUpdateShift(uid, dateStr, shift._id, {
                wsdStartTime: val,
                wsdStatus: '출근'
              });
            }
          }}
        />
      </div>
    );
  };

  const renderDayCell = (uid, dateStr) => {
    let dayShifts = editSchedules[uid]?.[dateStr] || [];
    if (dayShifts.length === 0) {
      dayShifts = [createEmptyShift(uid, dateStr, currentWorkPlaceIdx, null)];
    }
    return (
      <>
        {dayShifts.map(shift => renderShiftBlock(uid, dateStr, shift))}
      </>
    );
  };

  return (
    <div className="wat-board wat-desktop-grid">
      <div className="wat-board-scroll">
        <table className="wat-table w-100">
          <thead>
            <tr>
              <th className="wat-sticky-col">알바생</th>
              {weekDays.map((date, idx) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const { isHoly, isSat } = dayMeta(date);
                const peak = peakByDate[dateStr] || 0;
                const applied = appliedCountByDate[dateStr] || 0;
                const total = totalByDate[dateStr] || 0;
                const isColHighlighted = dayFilter !== 'ALL' && Number(dayFilter) === idx;
                return (
                  <th
                    key={dateStr}
                    className={`wat-day-head ${isHoly ? 'is-holy' : ''} ${isSat ? 'is-sat' : ''} ${isColHighlighted ? 'wat-col-highlighted' : ''}`}
                  >
                    <div>{format(date, 'MM/dd')}</div>
                    <div className="small fw-normal">{'일월화수목금토'[getDay(date)]}요일</div>
                    <div className="wat-head-chips">
                      <span className={`wat-apply-chip ${applied === 0 ? 'is-zero' : ''}`} title="해당 요일 신청 인원">
                        신청 {applied}
                      </span>
                      <span className={`wat-peak-chip ${peak === 0 ? 'is-zero' : ''}`} title="해당 요일 피크 동시 근무자 수">
                        피크 {peak}
                      </span>
                      <span className={`wat-total-chip ${total === 0 ? 'is-zero' : ''}`} title="해당 요일 전체 출근 인원">
                        전체 {total}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="wat-remarks-head text-center" style={{ minWidth: '130px', verticalAlign: 'middle' }}>
                비고
              </th>
            </tr>
          </thead>
          <tbody>
            {renderUsers.map(u => {
              const uid = toUserIdx(u.userIdx);
              const userRemark = schedules.find(s => toUserIdx(s.userIdx) === uid && s.wsdRemarks)?.wsdRemarks || '';
              const other = isOtherBranchWorker(u);
              const onLeave = isOnLeave(u);
              return (
                <tr key={uid} className={onLeave ? 'wat-row-leave' : undefined}>
                  <td className="wat-sticky-col">
                    <div className="wat-worker-head">
                      <div className="wat-worker-info">
                        <div className="wat-worker-name">
                          {u.userName}
                          {Number(u.nameSeq) > 1 && u.userIdx != null && (
                            <Badge bg="secondary" className="ms-1 align-middle">#{u.userIdx}</Badge>
                          )}
                          {onLeave && (
                            <Badge bg="warning" text="dark" className="ms-1 align-middle">휴직</Badge>
                          )}
                        </div>
                        <div className="wat-worker-meta">
                          {other && (
                            <Badge bg="secondary" className="mb-1">{u.workPlaceName || '타 지점'}</Badge>
                          )}
                        </div>
                        {renderRowBulkInput(u)}
                      </div>
                      {other && (
                        <Button
                          variant="link"
                          size="sm"
                          className="wat-icon-btn"
                          title="타지점 알바생 제거"
                          aria-label="타지점 알바생 제거"
                          onClick={() => handleRemoveOtherWorker(u)}
                        >
                          <RiCloseLine size={16} />
                        </Button>
                      )}
                    </div>
                  </td>
                  {weekDays.map((date, idx) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isColHighlighted = dayFilter !== 'ALL' && Number(dayFilter) === idx;
                    return (
                      <td key={dateStr} className={`wat-cell ${isColHighlighted ? 'wat-col-highlighted' : ''}`}>
                        {renderDayCell(uid, dateStr)}
                      </td>
                    );
                  })}
                  <td className="wat-cell wat-cell-remarks" style={{ verticalAlign: 'middle', fontSize: '0.85rem' }}>
                    <RemarkCell
                      text={userRemark}
                      userName={u.userName}
                      onOpen={onOpenRemarkModal}
                    />
                  </td>
                </tr>
              );
            })}
            {renderUsers.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted py-5">
                  표시할 알바생이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeeklyAssignDesktopTable;

