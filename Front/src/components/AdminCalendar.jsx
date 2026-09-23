import React, { useState, useEffect } from 'react';
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
import { RiArrowLeftSLine, RiArrowRightSLine, RiCalendarEventLine, RiArrowDownSLine } from 'react-icons/ri';
import { Dropdown, Badge } from 'react-bootstrap';
import Holidays from 'date-holidays';
import { fetchCalendarCounts } from '../api/workApi';
import './WorkCalendar.css';

const hd = new Holidays('KR');

const AdminCalendar = ({ selectedBranch, selectedBranchIdx, onDateClick, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarCounts, setCalendarCounts] = useState({});
  
  useEffect(() => {
    const loadCounts = async () => {
      if (!selectedBranchIdx) return;
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const res = await fetchCalendarCounts(year, month, selectedBranchIdx);
      if (res.success) {
        setCalendarCounts(res.data);
      }
    };
    loadCounts();
  }, [currentMonth, selectedBranchIdx]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

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
                return <Dropdown.Item key={year} onClick={() => setCurrentMonth(setYear(currentMonth, year))}>{year}년</Dropdown.Item>;
              })}
            </Dropdown.Menu>
          </Dropdown>

          <Dropdown className="d-inline-block">
            <Dropdown.Toggle variant="link" className="cal-title-dropdown text-dark fw-bolder fs-4 text-decoration-none px-1 shadow-none text-nowrap">
              {currentMonth.getMonth() + 1}월
            </Dropdown.Toggle>
            <Dropdown.Menu className="calendar-dropdown-menu">
              {[...Array(12)].map((_, i) => (
                <Dropdown.Item key={i} onClick={() => setCurrentMonth(setMonth(currentMonth, i))}>{i + 1}월</Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          <button 
            type="button"
            className="cal-today-btn ms-1 d-flex align-items-center gap-1 text-nowrap"
            onClick={() => {
              const today = new Date();
              setCurrentMonth(today);
              if (onDateClick) onDateClick(today);
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
        
        const formattedCloneDay = format(cloneDay, 'yyyy-MM-dd');
        const dayCount = calendarCounts[formattedCloneDay];
        const dayPeak = typeof dayCount === 'object' && dayCount != null
          ? Number(dayCount.peak) || 0
          : 0;
        
        const isSun = day.getDay() === 0;
        const isSat = day.getDay() === 6;
        const isHol = hd.isHoliday(day);
        const isRed = isSun || isHol;
        const isBlue = isSat && !isHol;

        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
        const isToday = isSameDay(day, new Date());

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
              }
              if (onDateClick) onDateClick(targetDate);
            }}
          >
            <span className={`cal-cell-number ${numColorClass}`}>
              {formattedDate}
            </span>
            <div className="cal-status-box">
              {dayPeak > 0 && (
                <Badge bg="warning" text="dark" className="cal-admin-badge text-center rounded-pill fw-bold">
                  <span className="d-none d-sm-inline">피크 {dayPeak}명</span>
                  <span className="d-sm-none">P{dayPeak}</span>
                </Badge>
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

  return (
    <div className="cal-wrapper-card h-100 d-flex flex-column">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="cal-main-title mb-0">지점별 근무 신청 현황</h4>
        <div className="cal-user-greeting">
          현재 조회: <span className="cal-user-name text-primary">{selectedBranch}</span>
        </div>
      </div>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};

export default AdminCalendar;
