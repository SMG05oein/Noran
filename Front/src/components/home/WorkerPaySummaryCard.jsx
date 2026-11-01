import React from 'react';
import {
  RiCalendarCheckLine,
  RiTimeLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowDownSLine
} from 'react-icons/ri';
import { format, subMonths, isSameMonth } from 'date-fns';

const WorkerPaySummaryCard = ({
  viewMonth,
  user,
  thisMonthHours,
  thisMonthDays,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
  onResetMonth
}) => {
  const monthNum = viewMonth.getMonth() + 1;
  const isCurrentMonth = isSameMonth(viewMonth, new Date());
  const estimatedPay = user?.userHourlyWage != null
    ? Math.floor(user.userHourlyWage * thisMonthHours * 0.967)
    : null;

  return (
    <div className="worker-pay-card mb-4">
      {/* 상단 월 네비게이터 */}
      <div className="worker-pay-nav position-relative d-flex align-items-center justify-content-center mb-3">
        <div className="worker-pay-picker-container">
          <button
            type="button"
            className="worker-pay-nav-btn"
            onClick={onPrevMonth}
            aria-label="이전 달로 이동"
          >
            <RiArrowLeftSLine size={20} />
          </button>

          <div className="position-relative d-inline-flex align-items-center">
            <button type="button" className="worker-pay-label-btn">
              {format(viewMonth, 'yyyy년 M월')}
              <RiArrowDownSLine size={16} className="ms-1 opacity-75" />
            </button>
            <select
              value={format(viewMonth, 'yyyy-MM')}
              onChange={(e) => {
                if (onSelectMonth) {
                  const [y, m] = e.target.value.split('-');
                  onSelectMonth(new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1));
                }
              }}
              className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
              style={{ cursor: 'pointer' }}
              aria-label="조회할 월 선택"
            >
              {[...Array(24)].map((_, i) => {
                const d = subMonths(new Date(), i);
                const val = format(d, 'yyyy-MM');
                return <option key={val} value={val}>{format(d, 'yyyy년 M월')}</option>;
              })}
            </select>
          </div>

          <button
            type="button"
            className="worker-pay-nav-btn"
            onClick={onNextMonth}
            aria-label="다음 달로 이동"
          >
            <RiArrowRightSLine size={20} />
          </button>
        </div>

        {!isCurrentMonth && onResetMonth && (
          <div className="position-absolute end-0 d-flex justify-content-end">
            <button
              type="button"
              className="worker-pay-today-btn"
              onClick={onResetMonth}
            >
              이번달
            </button>
          </div>
        )}
      </div>

      {estimatedPay != null && (
        <>
          <div className="worker-pay-header">
            <div className="stat-label mb-1">{monthNum}월 예상 급여</div>
            <div className="worker-pay-value">
              {estimatedPay.toLocaleString()}
              <span className="stat-unit">원</span>
            </div>
            <span className="worker-pay-note">실제 급여와 다를 수 있습니다</span>
          </div>
          <div className="worker-pay-divider" />
        </>
      )}

      <div className="worker-pay-stats d-flex align-items-center justify-content-around">
        <div className="worker-stat-inline text-center flex-fill">
          <div className="stat-label mb-1">
            <RiCalendarCheckLine className="me-1" /> {monthNum}월 근무일
          </div>
          <div className="stat-value">
            {thisMonthDays}<span className="stat-unit">일</span>
          </div>
        </div>
        <div className="worker-stat-separator" />
        <div className="worker-stat-inline text-center flex-fill">
          <div className="stat-label mb-1">
            <RiTimeLine className="me-1" /> {monthNum}월 근무시간
          </div>
          <div className="stat-value">
            {thisMonthHours.toFixed(1)}<span className="stat-unit">시간</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerPaySummaryCard;

