import React from 'react';

const RecordStatSummary = ({ totalDays = 0, totalHours = '0.0' }) => {
  return (
    <div className="rec-stat-card mb-3">
      <div className="rec-stat-col">
        <span className="rec-stat-label">이번 달 근무일</span>
        <div className="rec-stat-value">
          {totalDays}<span className="rec-stat-unit">일</span>
        </div>
      </div>
      <div className="rec-stat-divider" />
      <div className="rec-stat-col">
        <span className="rec-stat-label">누적 근무시간</span>
        <div className="rec-stat-value">
          {totalHours}
          <span className="rec-stat-unit">시간</span>
        </div>
      </div>
    </div>
  );
};

export default RecordStatSummary;
