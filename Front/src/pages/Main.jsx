import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { parseISO, addDays, isSameDay, isBefore, startOfDay } from 'date-fns';
import WorkCalendar from '../components/WorkCalendar';
import RecentLogs from '../components/RecentLogs';
import { fetchWorkRecords, fetchWorkRequests } from '../api/workApi';
import './Main.css';

const Main = () => {
  const [workRecords, setWorkRecords] = useState([]);
  const [workRequests, setWorkRequests] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const recRes = await fetchWorkRecords();
      if (recRes.success) setWorkRecords(recRes.data);
      
      const reqRes = await fetchWorkRequests();
      if (reqRes.success) setWorkRequests(reqRes.data);
    };
    loadData();
  }, []);

  const parseLocalTime = (time) => {
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

  const parseDateString = (dateObj) => {
    if (typeof dateObj === 'string') return parseISO(dateObj);
    if (Array.isArray(dateObj)) {
      const [y, m, d] = dateObj;
      return parseISO(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return new Date();
  };

  const calendarRecords = useMemo(() => {
    const combined = [];
    
    // 1. 근무 기록 매핑
    (workRecords || []).forEach(r => {
      if (r.wrDate) {
        const st = r.wrStartTime ? parseLocalTime(r.wrStartTime) : null;
        const et = r.wrEndTime ? parseLocalTime(r.wrEndTime) : null;
        combined.push({
          date: parseDateString(r.wrDate),
          status: 'WORKED',
          startTime: st ? `${String(st.hour).padStart(2,'0')}:${String(st.minute).padStart(2,'0')}` : null,
          endTime: et ? `${String(et.hour).padStart(2,'0')}:${String(et.minute).padStart(2,'0')}` : null
        });
      }
    });

    // 2. 근무 신청 매핑 (각 요일별로 쪼개서 표시)
    (workRequests || []).forEach(r => {
      if (r.wawDate) {
        const monday = parseDateString(r.wawDate);
        const pushStatus = (dayOffset, statusStr) => {
          const targetDate = addDays(monday, dayOffset);
          if (statusStr === '배정') {
            const hasWorked = combined.some(c => c.status === 'WORKED' && isSameDay(c.date, targetDate));
            if (!hasWorked) {
              if (isBefore(targetDate, startOfDay(new Date()))) {
                combined.push({ date: targetDate, status: 'MISSING' });
              } else {
                combined.push({ date: targetDate, status: 'APPROVED' });
              }
            }
          }
        };
        pushStatus(0, r.wawIsMon);
        pushStatus(1, r.wawIsTue);
        pushStatus(2, r.wawIsWed);
        pushStatus(3, r.wawIsThu);
        pushStatus(4, r.wawIsFri);
        pushStatus(5, r.wawIsSat);
        pushStatus(6, r.wawIsSun);
      }
    });

    return combined;
  }, [workRecords, workRequests]);

  return (
    <div className="main-container">
      <Container className="py-5">
        {/* 메인 캘린더 및 최근 기록 영역만 렌더링 */}
        <Row className="g-4">
          <Col lg={8}>
            <WorkCalendar mockRecords={calendarRecords} />
          </Col>
          <Col lg={4}>
            <RecentLogs mockRecords={calendarRecords.filter(r => r.status === 'WORKED')} />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Main;
