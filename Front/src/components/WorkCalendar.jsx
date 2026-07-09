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
import { FaChevronLeft, FaChevronRight, FaCheckCircle, FaCalendarCheck, FaExclamationTriangle } from 'react-icons/fa';
import { Dropdown } from 'react-bootstrap';
import Holidays from 'date-holidays';
import useAuthStore from '../store/useAuthStore';
import './WorkCalendar.css';

const hd = new Holidays('KR');

// mockRecords 형태: { date: Date객체, status: 'WORKED' | 'REQUESTED' | 'APPROVED' | 'MISSING' }

const WorkCalendar = ({ mockRecords }) => {
  const { user } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const renderHeader = () => {
    return (
      <div className="header row flex-middle">
        <div className="col col-start" onClick={prevMonth}>
          <div className="icon">
            <FaChevronLeft />
          </div>
        </div>
        <div className="col col-center d-flex justify-content-center align-items-center flex-nowrap">
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

          <button 
            className="btn btn-sm btn-outline-secondary ms-2 rounded-pill fw-bold text-nowrap flex-shrink-0" 
            onClick={() => setCurrentMonth(new Date())}
            style={{ padding: '2px 10px', fontSize: '0.8rem' }}
          >
            오늘
          </button>
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
    const date = ['일', '월', '화', '수', '목', '금', '토'];

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
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        
        // Find matching record
        const record = mockRecords.find(r => isSameDay(r.date, cloneDay));

        // 날짜 색상 로직
        const isSun = day.getDay() === 0;
        const isSat = day.getDay() === 6;
        const isHol = hd.isHoliday(day);
        const isRed = isSun || isHol;
        const isBlue = isSat && !isHol;

        days.push(
          <div
            className={`col cell ${
              !isSameMonth(day, monthStart)
                ? 'disabled-cell'
                : isSameDay(day, new Date())
                ? 'selected'
                : ''
            }`}
            key={day}
          >
            <span className={`number ${isRed ? 'text-danger' : isBlue ? 'text-primary' : ''}`}>
              {formattedDate}
            </span>
            {record && (
              <div className="status-marker">
                {record.status === 'WORKED' && <FaCheckCircle className="text-success" title="근무 완료" />}
                {record.status === 'APPROVED' && <FaCalendarCheck className="text-primary" title="근무 배정" />}
                {record.status === 'MISSING' && <FaExclamationTriangle className="text-danger" title="미기재 (경고)" />}
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
    <div className="calendar glass-card rounded-4 p-4 shadow-sm h-100 d-flex flex-column">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0" style={{ color: '#d35400' }}>내 근무 캘린더</h4>
        <div className="text-dark fw-bold fs-5">
          {user?.name} 님
        </div>
      </div>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      
      {/* 범례(Legend) 하단 배치 */}
      <div className="legend d-flex justify-content-center gap-3 text-muted mt-4 pt-3 border-top" style={{ fontSize: '0.9rem' }}>
        <span><FaCheckCircle className="text-success me-1"/>근무 완료</span>
        <span><FaCalendarCheck className="text-primary me-1"/>배정</span>
        <span><FaExclamationTriangle className="text-danger me-1"/>미기재</span>
      </div>
    </div>
  );
};

export default WorkCalendar;
