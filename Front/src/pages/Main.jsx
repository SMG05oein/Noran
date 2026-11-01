import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import {
  parseISO,
  isSameDay,
  isBefore,
  startOfDay,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import WorkCalendar from '../components/WorkCalendar';
import Loading from '../components/Loading';
import BirthdayBanner from '../components/BirthdayBanner';
import { getMonthlyWorkRecords, getMonthlyWorkApplyWorks } from '../api/workApi';
import useAuthStore from '../store/useAuthStore';
import { isBirthdayToday } from '../utils/birthUtils';
import HomeTabSwitcher from '../components/home/HomeTabSwitcher';
import WorkerHeroCard from '../components/home/WorkerHeroCard';
import WorkerPaySummaryCard from '../components/home/WorkerPaySummaryCard';
import RequestHistoryCard from '../components/requests/RequestHistoryCard';
import { CellDetailModal, ViewingRequestModal } from '../components/requests/RequestModals';
import { isBlankStatus, toDateStr } from '../components/requests/requestsUtils';
import './Main.css';

const Main = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // 캘린더 전용 상태
  const [calendarWorkRecords, setCalendarWorkRecords] = useState([]);
  const [calendarWorkRequests, setCalendarWorkRequests] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // 급여 요약 카드 전용 상태
  const [payMonth, setPayMonth] = useState(new Date());
  const [payRecords, setPayRecords] = useState([]);

  // 공통 위젯 상태 (오늘 출근 여부 및 이번 주 신청/배정 결과)
  const [todayRecord, setTodayRecord] = useState(null);
  const [thisWeekSchs, setThisWeekSchs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('status'); // 'status' (근무 현황) | 'calendar' (캘린더)
  const [selectedCellDetail, setSelectedCellDetail] = useState(null);
  const [viewingRequest, setViewingRequest] = useState(null);

  const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisMondayStr = format(thisMonday, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // 캘린더 데이터 로더
  const loadCalendarData = async (newMonth = null) => {
    const skipCache = !!newMonth;
    const targetDate = newMonth || calendarMonth;
    if (newMonth) setCalendarMonth(newMonth);

    try {
      const monthStart = startOfMonth(targetDate);
      const nextMonthDate = addMonths(monthStart, 1);
      const startDateStr = format(startOfWeek(monthStart, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const endDateStr = format(endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 }), 'yyyy-MM-dd');

      const [currRes, reqResCurr, reqResNext] = await Promise.all([
        getMonthlyWorkRecords(startDateStr, endDateStr, skipCache),
        getMonthlyWorkApplyWorks(targetDate.getFullYear(), targetDate.getMonth() + 1, skipCache),
        getMonthlyWorkApplyWorks(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, skipCache)
      ]);

      let mergedRecords = [];
      if (currRes.success) mergedRecords = mergedRecords.concat(currRes.data?.content || currRes.data || []);
      setCalendarWorkRecords(mergedRecords);

      let mergedReqs = [];
      if (reqResCurr.success) mergedReqs = mergedReqs.concat(reqResCurr.data?.content || (Array.isArray(reqResCurr.data) ? reqResCurr.data : []));
      if (reqResNext.success) mergedReqs = mergedReqs.concat(reqResNext.data?.content || (Array.isArray(reqResNext.data) ? reqResNext.data : []));

      const uniqueReqs = Array.from(new Map(mergedReqs.map(item => [`${toDateStr(item.date)}_${item.wsdIdx || item.applyWorkPlaceIdx || Math.random()}`, item])).values());
      setCalendarWorkRequests(uniqueReqs);

      return { records: mergedRecords, requests: uniqueReqs };
    } catch {
      return { records: [], requests: [] };
    }
  };

  // 급여 요약 데이터 로더
  const loadPayData = async (newMonth = null) => {
    const skipCache = !!newMonth;
    const targetDate = newMonth || payMonth;
    if (newMonth) setPayMonth(newMonth);

    try {
      const monthStart = startOfMonth(targetDate);
      const monthEnd = endOfMonth(targetDate);
      const startDateStr = format(monthStart, 'yyyy-MM-dd');
      const endDateStr = format(monthEnd, 'yyyy-MM-dd');

      const res = await getMonthlyWorkRecords(startDateStr, endDateStr, skipCache);
      if (res.success) {
        setPayRecords(res.data?.content || res.data || []);
      }
    } catch {
      setPayRecords([]);
    }
  };

  useEffect(() => {
    queueMicrotask(async () => {
      setLoading(true);
      try {
        const now = new Date();
        const [calResult] = await Promise.all([
          loadCalendarData(now),
          loadPayData(now)
        ]);

        if (calResult) {
          const tFound = (calResult.records || []).find(r => {
            if (!r.wrDate) return false;
            const dStr = typeof r.wrDate === 'string' ? r.wrDate : format(parseDateString(r.wrDate), 'yyyy-MM-dd');
            return dStr === todayStr;
          });
          setTodayRecord(tFound || null);

          const wFound = (calResult.requests || []).filter(sch => {
            if (isBlankStatus(sch.wsdStatus)) return false;
            const d = parseDateString(sch.date);
            const mDateStr = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            return mDateStr === thisMondayStr;
          });
          setThisWeekSchs(wFound);
        }
      } finally {
        setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 조회 중인 달의 근무 요약 지표 계산 (급여 카드용)
  const payMonthStr = format(payMonth, 'yyyy-MM');
  const thisMonthRecords = useMemo(() => {
    return (payRecords || []).filter(r => r.wrDate && (typeof r.wrDate === 'string' ? r.wrDate.startsWith(payMonthStr) : true));
  }, [payRecords, payMonthStr]);

  const thisMonthDays = thisMonthRecords.length;
  const thisMonthHours = useMemo(() => {
    return thisMonthRecords.reduce((acc, r) => acc + calculateHours(r.wrStartTime, r.wrEndTime, r.wrRestTime), 0);
  }, [thisMonthRecords]);

  const calendarRecords = useMemo(() => {
    const combined = [];

    // 1. 근무 기록 매핑 (실제 출근한 날)
    (calendarWorkRecords || []).forEach(r => {
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
    (calendarWorkRequests || []).forEach(r => {
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
  }, [calendarWorkRecords, calendarWorkRequests]);

  const actualBranchName = user?.workPlaceName || user?.branch || '소속 지점';
  const isBirthday = useMemo(() => isBirthdayToday(user?.userBirth), [user?.userBirth]);

  const handlePrevMonth = () => {
    const nextDate = subMonths(payMonth, 1);
    loadPayData(nextDate);
  };

  const handleNextMonth = () => {
    const nextDate = addMonths(payMonth, 1);
    loadPayData(nextDate);
  };

  const handleSelectMonth = (date) => {
    loadPayData(date);
  };

  const handleResetMonth = () => {
    loadPayData(new Date());
  };

  return (
    <div className="main-container">
      <Container className="py-4 py-md-5">
        {loading ? <Loading /> : <>
          {isBirthday && <BirthdayBanner userName={user?.name} />}

          {/* 1. 최상단 탭: 근무 현황 vs 캘린더 */}
          <HomeTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

          {/* 2. 인사말 히어로 카드 (두 탭 모두 공통 노출) */}
          <WorkerHeroCard
            actualBranchName={actualBranchName}
            user={user}
            todayRecord={todayRecord}
          />

          {/* 3. 탭별 분기 */}
          {activeTab === 'status' ? (
            <>
              {/* 월 예상 급여 & 근무일 & 근무시간 요약 카드 */}
              <WorkerPaySummaryCard
                viewMonth={payMonth}
                user={user}
                thisMonthHours={thisMonthHours}
                thisMonthDays={thisMonthDays}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onSelectMonth={handleSelectMonth}
                onResetMonth={handleResetMonth}
              />

              {/* 이번 주 근무 신청과 배정 결과 카드 */}
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2 px-1">
                  <span className="fw-bold fs-6" style={{ color: 'var(--color-text-main)' }}>
                    이번 주 근무 신청 및 배정 결과
                  </span>
                </div>
                <RequestHistoryCard
                  monDate={thisMondayStr}
                  weekSchs={thisWeekSchs}
                  reqDate={thisMondayStr}
                  setViewingRequest={setViewingRequest}
                  handleOpenEdit={() => navigate('/requests')}
                  setSelectedCellDetail={setSelectedCellDetail}
                  editButtonText="근무 신청"
                />
              </div>
            </>
          ) : (
            <Row>
              <Col xs={12}>
                <WorkCalendar mockRecords={calendarRecords} onMonthChange={loadCalendarData} initialMonth={calendarMonth} />
              </Col>
            </Row>
          )}

          <CellDetailModal
            selectedCellDetail={selectedCellDetail}
            onHide={() => setSelectedCellDetail(null)}
          />

          <ViewingRequestModal
            viewingRequest={viewingRequest}
            onHide={() => setViewingRequest(null)}
          />
        </>}
      </Container>
    </div>
  );
};

export default Main;
