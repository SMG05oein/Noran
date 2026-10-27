import React from 'react';
import { Button } from 'react-bootstrap';
import { RiArrowLeftSLine, RiArrowRightSLine, RiAddLine } from 'react-icons/ri';
import { subMonths, format } from 'date-fns';

const RecordMonthNavigator = ({
  selectedMonth,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
  onOpenNewModal
}) => {
  const [y, m] = (selectedMonth || '').split('-');
  const displayLabel = y && m ? `${y}년 ${parseInt(m, 10)}월` : '';

  return (
    <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
      <div className="rec-month-picker-container">
        <button
          type="button"
          className="rec-month-arrow-btn"
          onClick={onPrevMonth}
          aria-label="이전 달로 이동"
        >
          <RiArrowLeftSLine size={22} />
        </button>

        <div className="position-relative d-inline-flex align-items-center">
          <button type="button" className="rec-month-label-btn">
            {displayLabel}
          </button>
          <select
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
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
          className="rec-month-arrow-btn"
          onClick={onNextMonth}
          aria-label="다음 달로 이동"
        >
          <RiArrowRightSLine size={22} />
        </button>
      </div>

      <Button
        className="rec-add-btn"
        onClick={onOpenNewModal}
        aria-label="새 근무 기록 추가"
      >
        <RiAddLine size={18} /> 새 기록 추가
      </Button>
    </div>
  );
};

export default RecordMonthNavigator;
