import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Badge, Button } from 'react-bootstrap';
import { parseISO, addDays, isSameDay, isBefore, startOfDay, format, subMonths, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import WorkCalendar from '../components/WorkCalendar';
import Loading from '../components/Loading';
import { getMonthlyWorkRecords, getMonthlyWorkApplyWorks } from '../api/workApi';
import useAuthStore from '../store/useAuthStore';
import { RiCalendarCheckLine, RiTimeLine, RiAddLine, RiStore2Line } from 'react-icons/ri';
import './Main.css';

const Main = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [workRecords, setWorkRecords] = useState([]);
  const [workRequests, setWorkRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date());

  const loadData = async (newMonth = null) => {
    // 달이 바뀔 때는 무조건 최신 데이터를 불러오기 위해 skipCache(캐시 무시) 플래그를 true로 넘깁니다.
    const skipCache = !!newMonth;
    const targetDate = newMonth || viewMonth;
    if (newMonth) setViewMonth(newMonth);

    setLoading(true);
    try {
      // 달력의 이전 달/다음 달 며칠(Spillover)도 완벽히 커버하기 위해 캘린더 화면의 시작/종료일을 구함
      const monthStart = startOfMonth(targetDate);
      const startDateStr = format(startOfWeek(monthStart, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const endDateStr = format(endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 }), 'yyyy-MM-dd');

      const [currRes, reqRes] = await Promise.all([
        getMonthlyWorkRecords(startDateStr, endDateStr, skipCache),
        getMonthlyWorkApplyWorks(targetDate.getFullYear(), targetDate.getMonth() + 1, skipCache)
      ]);

      let mergedRecords = [];
      if (currRes.success) mergedRecords = mergedRecords.concat(currRes.data?.content || currRes.data || []);

      setWorkRecords(mergedRecords);

      if (reqRes.success) {
        const list = reqRes.data?.content || (Array.isArray(reqRes.data) ? reqRes.data : []);
        setWorkRequests(list);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    if (!dateObj) return new Date();
    if (typeof dateObj === 'string') {
      const parts = dateObj.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return parseISO(dateObj);
    }
    if (Array.isArray(dateObj)) {
      const [y, m, d] = dateObj;
      return new Date(y, m - 1, d);
    }
    return new Date(dateObj);
  };

  const calculateHours = (startRaw, endRaw, restRaw) => {
    if (!startRaw || !endRaw) return 0;
    const start = parseLocalTime(startRaw);
    const end = parseLocalTime(endRaw);
    const rest = restRaw ? parseLocalTime(restRaw) : { hour: 0, minute: 0 };

    const startNum = start.hour + start.minute / 60;
    let endNum = end.hour + end.minute / 60;
    if (endNum < startNum) endNum += 24;
    const restNum = rest.hour + rest.minute / 60;

    return Math.max(0, endNum - startNum - restNum);
  };

  // 조회 중인 달의 근무 요약 지표 계산
  const viewMonthStr = format(viewMonth, 'yyyy-MM');
  const thisMonthRecords = useMemo(() => {
    return (workRecords || []).filter(r => r.wrDate && (typeof r.wrDate === 'string' ? r.wrDate.startsWith(viewMonthStr) : true));
  }, [workRecords, viewMonthStr]);

  const thisMonthDays = thisMonthRecords.length;
  const thisMonthHours = useMemo(() => {
    return thisMonthRecords.reduce((acc, r) => acc + calculateHours(r.wrStartTime, r.wrEndTime, r.wrRestTime), 0);
  }, [thisMonthRecords]);

  // 오늘 근무 기록 여부 확인
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = useMemo(() => {
    return (workRecords || []).find(r => {
      if (!r.wrDate) return false;
      const dStr = typeof r.wrDate === 'string' ? r.wrDate : format(parseDateString(r.wrDate), 'yyyy-MM-dd');
      return dStr === todayStr;
    });
  }, [workRecords, todayStr]);

  const calendarRecords = useMemo(() => {
    const combined = [];

    // 1. 근무 기록 매핑 (실제 출근한 날)
    (workRecords || []).forEach(r => {
      if (r.wrDate) {
        const st = r.wrStartTime ? parseLocalTime(r.wrStartTime) : null;
        const et = r.wrEndTime ? parseLocalTime(r.wrEndTime) : null;
        combined.push({
          date: parseDateString(r.wrDate),
          status: 'WORKED',
          startTime: st ? `${String(st.hour).padStart(2, '0')}:${String(st.minute).padStart(2, '0')}` : null,
          endTime: et ? `${String(et.hour).padStart(2, '0')}:${String(et.minute).padStart(2, '0')}` : null
        });
      }
    });

    // 2. 근무 신청 및 배정 매핑 (단일 날짜 형식 대응)
    (workRequests || []).forEach(r => {
      if (r.date) {
        const targetDate = parseDateString(r.date);
        if (r.wsdStatus === '출근' || r.wsdStatus === '배정' || r.wsdStatus === '타지점근무') {
          if (r.wsdIsConfirmed !== true) return;
          const hasWorked = combined.some(c => c.status === 'WORKED' && isSameDay(c.date, targetDate));
          if (!hasWorked) {
            if (isBefore(targetDate, startOfDay(new Date()))) {
              combined.push({ date: targetDate, status: 'MISSING', time: r.wsdStartTime, wpName: r.wsdWorkPlaceName });
            } else {
              combined.push({ date: targetDate, status: 'APPROVED', time: r.wsdStartTime, wpName: r.wsdWorkPlaceName });
            }
          }
        }
      }
    });

    return combined;
  }, [workRecords, workRequests]);

  const actualBranchName = user?.workPlaceName || user?.branch || '소속 지점';

  return (
    <div className="main-container">
      <Container className="py-4 py-md-5">
        {loading ? <Loading /> : <>
          <div className="worker-hero-card">
            <div className="d-flex justify-content-between align-items-end gap-3">
              <div style={{ flex: '1 1 0%', minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                  <Badge bg="secondary" className="px-2 py-1 fw-bold d-inline-flex align-items-center gap-1">
                    <RiStore2Line /> {actualBranchName}
                  </Badge>
                  {user?.userType && (
                    <Badge bg="primary" className="px-2 py-1">
                      {user.userType}
                    </Badge>
                  )}
                </div>
                <h3 className="worker-hero-title mb-1 text-truncate">
                  안녕하세요, <span style={{ color: 'var(--color-primary)' }}>{user?.name || '직원'}</span>님!
                </h3>
                <p className="text-muted mb-0 small fw-semibold text-truncate">
                  {todayRecord
                    ? '오늘 근무가 기록되었습니다.'
                    : '오늘도 활기찬 하루 보내세요!'}
                </p>
              </div>

              <div className="d-flex flex-column flex-sm-row align-items-center gap-2" style={{ flexShrink: 0 }}>
                {todayRecord ? (
                  <div className="today-status-badge">
                    <RiCalendarCheckLine size={18} />
                    <span className="d-none d-sm-inline ms-1">근무 완료</span>
                    <span className="d-inline d-sm-none ms-1">완료</span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    className="quick-action-btn"
                    onClick={() => navigate('/records')}
                  >
                    <RiAddLine size={20} />
                    <span className="d-none d-sm-inline ms-1">근무 기록하기</span>
                    <span className="d-inline d-sm-none ms-1">기록</span>
                  </Button>
                )}
                <Button
                  variant="outline-secondary"
                  className="quick-action-btn"
                  onClick={() => navigate('/requests')}
                >
                  <RiCalendarCheckLine size={18} className="me-1" />
                  <span className="d-none d-sm-inline">근무 신청</span>
                  <span className="d-inline d-sm-none">신청</span>
                </Button>
              </div>
            </div>
          </div>

          {user?.userHourlyWage != null && (
            <div className="worker-pay-card">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <div className="stat-label mb-1">{viewMonth.getMonth() + 1}월 예상 급여</div>
                  <div className="worker-pay-value">
                    {Math.floor(user.userHourlyWage * thisMonthHours * 0.967).toLocaleString()}
                    <span className="stat-unit">원</span>
                  </div>
                  <span className="worker-pay-note">실제 급여와 다를 수 있습니다</span>
                </div>
              </div>
            </div>
          )}

          <Row className="g-3 mb-4">
            <Col xs={6}>
              <div className="worker-stat-card">
                <div className="stat-label">
                  <RiCalendarCheckLine /> {viewMonth.getMonth() + 1}월 근무일
                </div>
                <div className="stat-value">
                  {thisMonthDays}<span className="stat-unit">일</span>
                </div>
              </div>
            </Col>
            <Col xs={6}>
              <div className="worker-stat-card">
                <div className="stat-label">
                  <RiTimeLine /> {viewMonth.getMonth() + 1}월 근무시간
                </div>
                <div className="stat-value">
                  {thisMonthHours.toFixed(1)}<span className="stat-unit">시간</span>
                </div>
              </div>
            </Col>
          </Row>

          {/* 메인 캘린더 단독 전체 폭 배치 */}
          <Row>
            <Col xs={12}>
              <WorkCalendar mockRecords={calendarRecords} onMonthChange={loadData} initialMonth={viewMonth} />
            </Col>
          </Row>
        </>}
      </Container>
    </div>
  );
};

export default Main;
