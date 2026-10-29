import React from 'react';
import { Badge } from 'react-bootstrap';
import { format } from 'date-fns';
import { RiCloseLine, RiRefreshLine } from 'react-icons/ri';
import { toUserIdx, createEmptyShift, displayShiftStatus, getShiftTone, dayMeta, canResetShift } from './weeklyAssignUtils';
import { openStartTimeForDate } from '../../utils/shiftReset';

const WeeklyAssignMobileView = ({
  weekDays,
  mobileDayIdx,
  setMobileDayIdx,
  peakByDate,
  appliedCountByDate,
  totalByDate,
  dayFilter,
  mobileDateStr,
  mobileDisplayUsers,
  schedules,
  editSchedules,
  currentWorkPlaceIdx,
  isOtherBranchWorker,
  isOnLeave,
  renderRowBulkInput,
  handleRemoveOtherWorker,
  handleUpdateShift,
  handleRemoveShift,
  setRemarkModal,
  setMobileTimeSheet,
  onlyApplied,
  touchStartX,
  touchStartY
}) => {
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) {
        setMobileDayIdx(prev => Math.min(prev + 1, 6));
      } else {
        setMobileDayIdx(prev => Math.max(prev - 1, 0));
      }
    }
  };

  return (
    <>
      <div className="wat-day-tabs" data-html2canvas-ignore="true">
        {weekDays.map((date, idx) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const { isHoly, isSat } = dayMeta(date);
          const peak = peakByDate[dateStr] || 0;
          const applied = appliedCountByDate[dateStr] || 0;
          const total = totalByDate[dateStr] || 0;
          const isDayFiltered = dayFilter !== 'ALL' && Number(dayFilter) === idx;
          const isShortage = peak > 0 && applied < peak;
          return (
            <button
              key={dateStr}
              type="button"
              className={`wat-day-tab ${mobileDayIdx === idx ? 'active' : ''} ${isHoly ? 'is-holy' : ''} ${isSat ? 'is-sat' : ''} ${isDayFiltered ? 'wat-tab-filtered' : ''} ${isShortage ? 'is-shortage' : ''}`}
              onClick={() => setMobileDayIdx(idx)}
              aria-label={`${format(date, 'MM/dd')} ${'월화수목금토일'[idx]}요일 신청 ${applied}명, 피크 ${peak}명, 전체 ${total}명${isShortage ? ' (인원 부족)' : ''}`}
            >
              <div className="wat-tab-day-name">{'월화수목금토일'[idx]}</div>
              <div className="wat-tab-date">{format(date, 'MM/dd')}</div>
              <div className="wat-tab-chips">
                <span className={`wat-apply-chip ${applied === 0 ? 'is-zero' : ''} ${isShortage ? 'is-shortage' : ''}`} title={`신청 ${applied}명`}>
                  신{applied}
                </span>
                <span className={`wat-peak-chip ${peak === 0 ? 'is-zero' : ''}`} title={`피크 ${peak}명`}>
                  P{peak}
                </span>
                <span className={`wat-total-chip ${total === 0 ? 'is-zero' : ''}`} title={`전체 출근 ${total}명`}>
                  T{total}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="wat-mobile-list"
        data-html2canvas-ignore="true"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {mobileDisplayUsers.map(u => {
          const uid = toUserIdx(u.userIdx);
          const userRemark = schedules.find(s => toUserIdx(s.userIdx) === uid && s.wsdRemarks)?.wsdRemarks || '';
          const other = isOtherBranchWorker(u);
          const onLeave = isOnLeave(u);
          let dayShifts = editSchedules[uid]?.[mobileDateStr] || [];
          if (dayShifts.length === 0) {
            dayShifts = [createEmptyShift(uid, mobileDateStr, currentWorkPlaceIdx, null)];
          }
          const firstShift = dayShifts[0];
          const hadApply = firstShift ? !!(firstShift.originHadApply || firstShift.wsdStatus === '신청') : false;
          const openApply = firstShift ? !!firstShift.originOpenApplied : false;

          return (
            <div key={uid} className={`wat-mobile-row${onLeave ? ' is-leave' : ''}`}>
              <div className="wat-mobile-row-left">
                <div className="wat-mobile-name-line">
                  <span className="wat-worker-name">{u.userName}</span>
                  {Number(u.nameSeq) > 1 && u.userIdx != null && (
                    <Badge bg="secondary" className="wat-tag-mini">#{u.userIdx}</Badge>
                  )}
                  {onLeave && (
                    <Badge bg="warning" text="dark" className="wat-tag-mini">휴직</Badge>
                  )}
                  {other && (
                    <Badge bg="secondary" className="wat-tag-mini">{u.workPlaceName || '타지점'}</Badge>
                  )}
                </div>
                <div className="wat-mobile-badge-line">
                  {openApply ? (
                    <span className="wat-badge-applied-open">오픈 신청</span>
                  ) : hadApply ? (
                    <span className="wat-badge-applied">신청</span>
                  ) : firstShift?.wsdStatus === '출근' ? (
                    <span className="wat-badge-assigned">출근</span>
                  ) : firstShift?.wsdStatus === '미출근' ? (
                    <span className="wat-badge-unassigned">미출근</span>
                  ) : (
                    <span className="wat-badge-unapplied">미신청</span>
                  )}
                  {renderRowBulkInput(u)}
                  {other && (
                    <button
                      type="button"
                      className="wat-mini-remove-btn"
                      title="타지점 알바생 제거"
                      aria-label="타지점 알바생 제거"
                      onClick={() => handleRemoveOtherWorker(u)}
                    >
                      <RiCloseLine size={15} />
                    </button>
                  )}
                </div>
                {userRemark && (
                  <div
                    className="wat-mobile-remark-line"
                    onClick={() => setRemarkModal({ show: true, userName: u.userName, text: userRemark })}
                    role="button"
                    tabIndex={0}
                    title={userRemark}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setRemarkModal({ show: true, userName: u.userName, text: userRemark });
                      }
                    }}
                  >
                    <span className="wat-mobile-remark-label">비고:</span>
                    <span className="wat-mobile-remark-text">{userRemark}</span>
                  </div>
                )}
              </div>
              <div className="wat-mobile-row-right">
                {dayShifts.map(shift => {
                  const openHint = !!shift.originOpenApplied && !shift.wsdIsOpen;
                  return (
                    <div key={shift._id} className="wat-mobile-shift-group">
                      {/* 되돌리기 버튼: 변경된 경우 노출 */}
                      {canResetShift(shift) && (
                        <button
                          type="button"
                          className="wat-mobile-reset-btn"
                          title="되돌리기"
                          aria-label="되돌리기"
                          onClick={() => handleRemoveShift(uid, mobileDateStr, shift._id)}
                        >
                          <RiRefreshLine size={16} />
                        </button>
                      )}

                      <button
                        type="button"
                        className={`wat-toggle-chip wat-chip-open ${shift.wsdIsOpen ? 'is-active' : ''} ${openHint ? 'is-hint' : ''}`}
                        onClick={() => {
                          const nextVal = !shift.wsdIsOpen;
                          handleUpdateShift(uid, mobileDateStr, shift._id, {
                            wsdIsOpen: nextVal,
                            ...(nextVal ? {
                              wsdStatus: '출근',
                              wsdStartTime: shift.wsdStartTime || openStartTimeForDate(mobileDateStr)
                            } : {})
                          });
                        }}
                        aria-label={`${u.userName} 오픈 토글`}
                        aria-pressed={!!shift.wsdIsOpen}
                        title={openHint ? '오픈 신청함 (클릭 시 오픈 출근)' : '오픈 토글'}
                      >
                        오픈
                      </button>

                      <button
                        type="button"
                        className={`wat-toggle-chip wat-chip-close ${shift.wsdIsClose ? 'is-active' : ''}`}
                        onClick={() => {
                          const nextVal = !shift.wsdIsClose;
                          handleUpdateShift(uid, mobileDateStr, shift._id, {
                            wsdIsClose: nextVal,
                            ...(nextVal ? { wsdStatus: '출근' } : {})
                          });
                        }}
                        aria-label={`${u.userName} 마감 토글`}
                        aria-pressed={!!shift.wsdIsClose}
                        title="마감 토글"
                      >
                        마감
                      </button>

                      <button
                        type="button"
                        className={`wat-mobile-time-trigger assign-status-input ${getShiftTone(shift)}`}
                        onClick={() => {
                          setMobileTimeSheet({
                            show: true,
                            uid,
                            userName: u.userName,
                            dateStr: mobileDateStr,
                            shiftId: shift._id
                          });
                        }}
                        aria-label={`${u.userName} 근무 시간 또는 상태 선택`}
                      >
                        {shift.wsdStartTime || displayShiftStatus(shift)}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {mobileDisplayUsers.length === 0 && (
          <div className="text-center text-muted py-4 small">
            {onlyApplied ? '해당 날짜에 신청 또는 배정된 알바생이 없습니다.' : '표시할 알바생이 없습니다.'}
          </div>
        )}
      </div>
    </>
  );
};

export default WeeklyAssignMobileView;

