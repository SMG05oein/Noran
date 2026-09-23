import React, { useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  setYear,
  setMonth
} from 'date-fns';
import { 
  RiArrowLeftSLine, 
  RiArrowRightSLine, 
  RiCheckboxCircleLine, 
  RiCalendarCheckLine, 
  RiErrorWarningLine, 
  RiCalendarEventLine,
  RiArrowDownSLine
} from 'react-icons/ri';
import { Dropdown } from 'react-bootstrap';
import { isHoliday } from 'holiday-kr';
import useAuthStore from '../store/useAuthStore';
import './WorkCalendar.css';

const WorkCalendar = ({ mockRecords = [], selectedDate: externalSelectedDate, initialMonth, onDateClick, onMonthChange }) => {
  const { user } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(initialMonth || new Date());
  const [internalSelectedDate, setInternalSelectedDate] = useState(new Date());
  const selectedDate = externalSelectedDate !== undefined ? externalSelectedDate : internalSelectedDate;

  const nextMonth = () => {
    const d = addMonths(currentMonth, 1);
    setCurrentMonth(d);
    if (onMonthChange) onMonthChange(d);
  };
  const prevMonth = () => {
    const d = subMonths(currentMonth, 1);
    setCurrentMonth(d);
    if (onMonthChange) onMonthChange(d);
  };

  const renderHeader = () => {
    return (
      <div className="cal-header d-flex align-items-center justify-content-between mb-4">
        <button 
          type="button"
          className="cal-nav-btn flex-shrink-0" 
          onClick={prevMonth} 
          title="이전 달"
        >
          <RiArrowLeftSLine size={22} />
        </button>

        <div className="d-flex align-items-center justify-content-center gap-1 gap-sm-2 flex-nowrap">
          <Dropdown className="d-inline-block">
            <Dropdown.Toggle variant="link" className="cal-title-dropdown text-dark fw-bolder fs-4 text-decoration-none px-1 shadow-none text-nowrap">
              {currentMonth.getFullYear()}년
            </Dropdown.Toggle>
            <Dropdown.Menu className="calendar-dropdown-menu">
              {[...Array(10)].map((_, i) => {
                const year = new Date().getFullYear() - 3 + i;
                return (
                  <Dropdown.Item key={year} onClick={() => {
                    const d = setYear(currentMonth, year);
                    setCurrentMonth(d);
                    if (onMonthChange) onMonthChange(d);
                  }}>{year}년</Dropdown.Item>
                );
              })}
            </Dropdown.Menu>
          </Dropdown>

          <Dropdown className="d-inline-block">
            <Dropdown.Toggle variant="link" className="cal-title-dropdown text-dark fw-bolder fs-4 text-decoration-none px-1 shadow-none text-nowrap">
              {currentMonth.getMonth() + 1}월
            </Dropdown.Toggle>
            <Dropdown.Menu className="calendar-dropdown-menu">
              {[...Array(12)].map((_, i) => (
                <Dropdown.Item key={i} onClick={() => {
                  const d = setMonth(currentMonth, i);
                  setCurrentMonth(d);
                  if (onMonthChange) onMonthChange(d);
                }}>{i + 1}월</Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          <button 
            type="button"
            className="cal-today-btn ms-1 d-flex align-items-center gap-1 text-nowrap" 
            onClick={() => {
              const today = new Date();
              setCurrentMonth(today);
              setInternalSelectedDate(today);
              if (onDateClick) onDateClick(today);
              if (onMonthChange) onMonthChange(today);
            }}
            title="오늘 날짜로 이동"
          >
            <RiCalendarEventLine size={15} /> 오늘
          </button>
        </div>

        <button 
          type="button"
          className="cal-nav-btn flex-shrink-0" 
          onClick={nextMonth} 
          title="다음 달"
        >
          <RiArrowRightSLine size={22} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const daysHeader = [
      { name: '일', className: 'cal-day-sun' },
      { name: '월', className: 'cal-day-work' },
      { name: '화', className: 'cal-day-work' },
      { name: '수', className: 'cal-day-work' },
      { name: '목', className: 'cal-day-work' },
      { name: '금', className: 'cal-day-work' },
      { name: '토', className: 'cal-day-sat' },
    ];

    return (
      <div className="cal-days-row">
        {daysHeader.map((d, i) => (
          <div className={`cal-day-col ${d.className}`} key={i}>
            {d.name}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const cloneDay = day;
        const isCurrentMonth = isSameMonth(day, monthStart);
        
        const record = mockRecords.find(r => isSameDay(r.date, cloneDay));

        const isSun = day.getDay() === 0;
        const isSat = day.getDay() === 6;
        const isHol = isHoliday(day.getFullYear(), day.getMonth() + 1, day.getDate());
        const isRed = isSun || isHol;
        const isBlue = isSat && !isHol;

        const isToday = isSameDay(day, new Date());
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

        let numColorClass = 'cal-num-default';
        if (!isCurrentMonth) {
          numColorClass = 'cal-num-disabled';
        } else if (isRed) {
          numColorClass = 'cal-num-red';
        } else if (isBlue) {
          numColorClass = 'cal-num-blue';
        }

        days.push(
          <div
            className={`cal-cell ${
              !isCurrentMonth
                ? 'cal-cell-disabled'
                : isSelected
                ? 'cal-cell-active'
                : isToday
                ? 'cal-cell-today'
                : ''
            }`}
            key={day.toISOString()}
            onClick={() => {
              const targetDate = new Date(cloneDay.getTime());
              if (!isCurrentMonth) {
                setCurrentMonth(targetDate);
                if (onMonthChange) onMonthChange(targetDate);
              }
              setInternalSelectedDate(targetDate);
              if (onDateClick) onDateClick(targetDate);
            }}
          >
            {/* 날짜 번호 */}
            <span className={`cal-cell-number ${numColorClass}`}>
              {formattedDate}
            </span>

            {/* 상태 마커 아이콘 */}
            <div className="cal-status-box">
              {record && (
                <>
                  {record.status === 'WORKED' && (
                    <RiCheckboxCircleLine className="cal-icon-success" size={19} title="근무 완료" />
                  )}
                  {record.status === 'APPROVED' && (
                    <RiCalendarCheckLine className="cal-icon-primary" size={19} title="출근" />
                  )}
                  {record.status === 'MISSING' && (
                    <RiErrorWarningLine className="cal-icon-danger" size={19} title="미기재 (경고)" />
                  )}
                </>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="cal-grid-row" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="cal-grid-body">{rows}</div>;
  };

  const pureUserName = user?.name || user?.userName || '알바생';

  return (
    <div className="cal-wrapper-card h-100 d-flex flex-column">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="cal-main-title mb-0">내 근무 캘린더</h4>
        <div className="cal-user-greeting">
          <span className="cal-user-name">{pureUserName}</span> 님의 일정
        </div>
      </div>

      {renderHeader()}
      {renderDays()}
      {renderCells()}
      
      {/* 범례(Legend) 하단 카드 배치 */}
      <div className="cal-legend-bar d-flex justify-content-center align-items-center gap-4 flex-wrap">
        <span className="cal-legend-item">
          <RiCheckboxCircleLine className="cal-icon-success" size={18} /> 근무 완료
        </span>
        <span className="cal-legend-item">
          <RiCalendarCheckLine className="cal-icon-primary" size={18} /> 출근
        </span>
        <span className="cal-legend-item">
          <RiErrorWarningLine className="cal-icon-danger" size={18} /> 미기재
        </span>
      </div>
    </div>
  );
};

export default WorkCalendar;
