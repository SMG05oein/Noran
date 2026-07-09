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
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Dropdown } from 'react-bootstrap';
import Holidays from 'date-holidays';
import { fetchCalendarCounts } from '../api/workApi';
import './WorkCalendar.css';

const hd = new Holidays('KR');

const AdminCalendar = ({ selectedBranch, selectedBranchIdx, onDateClick, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarCounts, setCalendarCounts] = useState({}); // { "2026-07-01": 2, ... }
  
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
      <div className="header row flex-middle">
        <div className="col col-start" onClick={prevMonth}>
          <div className="icon">
            <FaChevronLeft />
          </div>
        </div>
        <div className="col col-center d-flex justify-content-center align-items-center text-nowrap flex-nowrap">
          <Dropdown className="d-inline-block">
            <Dropdown.Toggle variant="link" className="text-dark fw-bold fs-4 text-decoration-none px-1 shadow-none text-nowrap">
              {currentMonth.getFullYear()}년
            </Dropdown.Toggle>
            <Dropdown.Menu className="calendar-dropdown-menu" style={{ minWidth: '100px', maxHeight: '250px', overflowY: 'auto' }}>
              {[...Array(10)].map((_, i) => {
                const year = new Date().getFullYear() - 3 + i;
                return <Dropdown.Item key={year} onClick={() => setCurrentMonth(setYear(currentMonth, year))}>{year}년</Dropdown.Item>;
              })}
            </Dropdown.Menu>
          </Dropdown>

          <Dropdown className="d-inline-block">
            <Dropdown.Toggle variant="link" className="text-dark fw-bold fs-4 text-decoration-none px-1 shadow-none text-nowrap">
              {currentMonth.getMonth() + 1}월
            </Dropdown.Toggle>
            <Dropdown.Menu className="calendar-dropdown-menu" style={{ minWidth: '100px', maxHeight: '250px', overflowY: 'auto' }}>
              {[...Array(12)].map((_, i) => (
                <Dropdown.Item key={i} onClick={() => setCurrentMonth(setMonth(currentMonth, i))}>{i + 1}월</Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          
          <span className="fw-bold fs-4 ms-2 text-nowrap flex-shrink-0 text-truncate">- {selectedBranch}</span>
        </div>
        <div className="col col-end" onClick={nextMonth}>
          <div className="icon">
            <FaChevronRight />
          </div>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const date = ['월', '화', '수', '목', '금', '토', '일'];

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="col col-center fw-bold text-muted py-2" key={i}>
          {date[i]}
        </div>
      );
    }
    return <div className="days row">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        
        const formattedCloneDay = format(cloneDay, 'yyyy-MM-dd');
        const acceptCount = calendarCounts[formattedCloneDay] || 0;
        
        // 날짜 색상 로직
        const isSun = day.getDay() === 0;
        const isSat = day.getDay() === 6;
        const isHol = hd.isHoliday(day);
        const isRed = isSun || isHol;
        const isBlue = isSat && !isHol;

        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());

        days.push(
          <div
            className={`col cell ${
              !isSameMonth(day, monthStart)
                ? 'disabled-cell'
                : isSelected
                ? 'selected bg-light border-primary'
                : ''
            }`}
            style={{ cursor: 'pointer', borderWidth: isSelected ? '2px' : '1px' }}
            key={day}
            onClick={() => {
              if (isSameMonth(cloneDay, monthStart) && onDateClick) {
                onDateClick(cloneDay);
              }
            }}
          >
            <span className={`number ${
              isToday 
                ? 'bg-primary text-white rounded-circle d-inline-block text-center' 
                : isRed 
                  ? 'text-danger' 
                  : isBlue 
                    ? 'text-primary' 
                    : ''
              }`}
              style={isToday ? { width: '24px', height: '24px', lineHeight: '24px' } : {}}
            >
              {formattedDate}
            </span>
            {acceptCount > 0 && (
              <div className="status-marker mt-auto w-100 px-1 d-flex flex-column gap-1">
                <div className="bg-success text-white text-center rounded-pill small fw-bold py-1" style={{ fontSize: '0.75rem' }}>
                  <span className="d-none d-sm-inline">배정 {acceptCount}명</span>
                  <span className="d-sm-none">{acceptCount}</span>
                </div>
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="row" key={day}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="body">{rows}</div>;
  };

  return (
    <div className="calendar glass-card rounded-4 p-4 shadow-sm h-100">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0 text-dark">지점별 근무 신청 현황</h4>
      </div>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};

export default AdminCalendar;
