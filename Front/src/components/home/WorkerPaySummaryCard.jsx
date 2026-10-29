import React from 'react';
import { RiCalendarCheckLine, RiTimeLine } from 'react-icons/ri';

const WorkerPaySummaryCard = ({
  viewMonth,
  user,
  thisMonthHours,
  thisMonthDays
}) => {
  const monthNum = viewMonth.getMonth() + 1;
  const estimatedPay = user?.userHourlyWage != null
    ? Math.floor(user.userHourlyWage * thisMonthHours * 0.967)
    : null;

  return (
    <div className="worker-pay-card mb-4">
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

