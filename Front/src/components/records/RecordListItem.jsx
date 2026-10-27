import React from 'react';
import { Badge, Button } from 'react-bootstrap';
import { RiTimeLine, RiFileTextLine, RiArrowDownSLine, RiAddLine } from 'react-icons/ri';
import { isHoliday } from 'korean-holidays';

export const parseLocalTime = (time) => {
  if (!time) return { hour: 0, minute: 0 };
  if (typeof time === 'string') {
    const parts = time.split(':');
    return { hour: parseInt(parts[0], 10) || 0, minute: parseInt(parts[1], 10) || 0 };
  }
  if (Array.isArray(time)) {
    return { hour: time[0] || 0, minute: time[1] || 0 };
  }
  return { hour: time.hour || 0, minute: time.minute || 0 };
};

export const calculateTotalHours = (startRaw, endRaw, restRaw) => {
  if (!startRaw || !endRaw) return 0;
  const start = parseLocalTime(startRaw);
  const end = parseLocalTime(endRaw);
  const rest = restRaw ? parseLocalTime(restRaw) : { hour: 0, minute: 0 };

  const startNum = start.hour + (start.minute / 60);
  let endNum = end.hour + (end.minute / 60);
  if (endNum < startNum) endNum += 24;

  const restNum = rest.hour + (rest.minute / 60);

  return Math.max(0, endNum - startNum - restNum);
};

const RecordListItem = ({
  record,
  isExpanded,
  onToggle,
  onDelete,
  onEdit,
  onOpenMissing
}) => {
  const st = parseLocalTime(record.wrStartTime);
  const et = parseLocalTime(record.wrEndTime);
  const sh = String(st.hour).padStart(2, '0');
  const sm = String(st.minute).padStart(2, '0');
  const eh = String(et.hour).padStart(2, '0');
  const em = String(et.minute).padStart(2, '0');
  const rt = record.wrRestTime ? parseLocalTime(record.wrRestTime) : null;
  const totalHours = calculateTotalHours(record.wrStartTime, record.wrEndTime, record.wrRestTime).toFixed(1);
  const hasRest = rt && (rt.hour > 0 || rt.minute > 0);
  const restLabel = hasRest ? `휴게 ${rt.hour > 0 ? `${rt.hour}시간` : ''}${rt.minute > 0 ? ` ${rt.minute}분` : ''}`.trim() : null;

  const d = new Date(record.wrDate);
  const dayNum = isNaN(d) ? '' : d.getDate();
  const dayOfWeekIdx = isNaN(d) ? -1 : d.getDay();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayOfWeekIdx >= 0 ? days[dayOfWeekIdx] : '';
  const isSat = dayOfWeekIdx === 6;
  const isSunOrHoli = dayOfWeekIdx === 0 || (!isNaN(d) && isHoliday(d));

  return (
    <div className={`rec-item-card ${isExpanded ? 'is-expanded' : ''}`}>
      <div
        className="rec-item-header-row"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`${record.wrDate} 근무 기록 상세`}
      >
        {/* 좌측: 일 + 요일 */}
        <div className="rec-date-col">
          <span className="rec-day-num">{dayNum}</span>
          <span className={`rec-day-name ${isSunOrHoli ? 'rec-day-sun' : isSat ? 'rec-day-sat' : ''}`}>
            {dayName}
          </span>
        </div>

        {/* 중앙: 시간 / 비고 */}
        <div className="rec-center-col">
          {record.isMissing ? (
            <span className="rec-missing-badge">
              <RiTimeLine /> 미기재 ({record.assignedStartTime?.substring(0, 5) || '배정'})
            </span>
          ) : (
            <div className="rec-time-text">
              <RiTimeLine size={15} />
              <span>{sh}:{sm} – {eh}:{em}</span>
              {restLabel && <span className="rec-rest-tag">· {restLabel}</span>}
            </div>
          )}
          {!record.isMissing && record.wrRemarks && (
            <div className="rec-remark-badge">
              <RiFileTextLine size={11} />
              <span>비고 있음</span>
            </div>
          )}
        </div>

        {/* 우측: 근무시간 + 화살표 */}
        <div className="rec-right-col">
          {record.isMissing ? (
            <Badge bg="danger" className="py-1 px-2 fw-bold" style={{ fontSize: '0.78rem' }}>미기재</Badge>
          ) : (
            <div className="rec-hours-text">
              {totalHours}<span className="rec-unit">시간</span>
            </div>
          )}
          <span className="rec-expand-arrow">
            <RiArrowDownSLine size={20} />
          </span>
        </div>
      </div>

      {/* 펼침 영역 */}
      {isExpanded && (
        <div className="rec-expanded-body" onClick={(e) => e.stopPropagation()}>
          {record.isMissing ? (
            <div className="text-center py-2">
              <p className="text-muted mb-2 small fw-medium">이 날짜에 배정되었으나 근무 기록이 없습니다.</p>
              <Button
                variant="primary"
                size="sm"
                className="fw-bold px-3 py-2 border-0 d-inline-flex align-items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenMissing) onOpenMissing(record);
                }}
              >
                <RiAddLine size={16} /> 기록 추가하기
              </Button>
            </div>
          ) : (
            <>
              {record.wrRemarks && (
                <div className="rec-remarks-box">
                  <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.72rem' }}>[비고 메모]</div>
                  <div>{record.wrRemarks}</div>
                </div>
              )}
              <div className="rec-action-buttons">
                <Button
                  type="button"
                  variant="outline-danger"
                  className="rec-del-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) onDelete(record.wrIdx);
                  }}
                  aria-label="근무 기록 삭제"
                >
                  삭제
                </Button>
                <Button
                  type="button"
                  variant="light"
                  className="rec-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) onEdit(record);
                  }}
                  aria-label="근무 기록 수정"
                >
                  수정
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RecordListItem;
