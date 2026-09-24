import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Container, Card, Table, Button, Spinner, Badge } from 'react-bootstrap';
import { fetchWorkRecords, fetchDailySchedule } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import { parseISO, format } from 'date-fns';
import { RiCalendarCheckLine, RiStore2Line, RiUserStarLine, RiGroupLine, RiTimeLine } from 'react-icons/ri';
import AdminCalendar from '../components/AdminCalendar';
import Loading from '../components/Loading';
import { countTotal, countPeak } from '../utils/shiftPeak';
import './AdminMain.css';

const AdminMain = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedWpIdx, setSelectedWpIdx] = useState(user?.workPlaceIdx || null);
  const [branches, setBranches] = useState([]);

  const [workRecords, setWorkRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailySchedule, setDailySchedule] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  const currentBranchObj = useMemo(() => {
    if (branches.length === 0) return null;
    return branches.find(b => Number(b.wpIdx) === Number(selectedWpIdx)) || branches[0];
  }, [branches, selectedWpIdx]);

  const selectedBranchIdx = currentBranchObj?.wpIdx || selectedWpIdx;
  const selectedBranchName = currentBranchObj?.wpName || user?.branch || '지점';

  const dayHeadcount = useMemo(() => {
    // 관리자 대시보드: 임시 저장(미확정) 배정도 출근/피크에 포함
    return {
      total: countTotal(dailySchedule, { requireConfirmed: false }),
      peak: countPeak(dailySchedule, { requireConfirmed: false })
    };
  }, [dailySchedule]);

  const loadData = async () => {
    setLoading(true);
    const [recRes, branchRes] = await Promise.all([
      fetchWorkRecords(),
      fetchWorkPlaces()
    ]);
    if (recRes.success) setWorkRecords(recRes.data.content || recRes.data || []);
    if (branchRes.success && branchRes.data) {
      setBranches(branchRes.data);
      // 로그인한 관리자의 소속 지점(workPlaceName 또는 workPlaceIdx)과 일치하는 지점 우선 선택
      const userWpName = user?.workPlaceName || user?.branch;
      const myBranch = branchRes.data.find(b =>
        (user?.workPlaceIdx && Number(b.wpIdx) === Number(user.workPlaceIdx)) ||
        (userWpName && (b.wpName === userWpName || userWpName.includes(b.wpName) || b.wpName.includes(userWpName)))
      );
      if (myBranch && !selectedWpIdx) {
        setSelectedWpIdx(myBranch.wpIdx);
      } else if (!selectedWpIdx || !branchRes.data.some(b => Number(b.wpIdx) === Number(selectedWpIdx))) {
        setSelectedWpIdx(myBranch?.wpIdx || branchRes.data[0]?.wpIdx || null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const loadDaily = async () => {
      if (!selectedBranchIdx) return;
      setDailyLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetchDailySchedule(dateStr, selectedBranchIdx);
      if (res.success) {
        setDailySchedule(res.data || []);
      }
      setDailyLoading(false);
    };
    loadDaily();
  }, [selectedDate, selectedBranchIdx]);

  return (
    <div className="admin-container">
      <Container className="py-4 py-md-5">
        {/* 상단 관리자 대시보드 헤더 */}
        <div className="admin-header-card">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <Badge bg="danger" className="px-3 py-1 fw-bold d-inline-flex align-items-center gap-1">
                  <RiUserStarLine /> 관리자 대시보드
                </Badge>
                {user?.branch && (
                  <Badge bg="secondary" className="px-2 py-1">
                    <RiStore2Line className="me-1" />{user.branch}
                  </Badge>
                )}
              </div>
              <h3 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>
                {user?.name || '관리자'}님, 안녕하세요!
              </h3>
              <p className="text-muted mb-0 small">
                지점별 출근 현황 및 주간 근무 일정을 편리하게 관리하세요.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button
                variant="primary"
                className="fw-bold px-3 py-2 d-flex align-items-center gap-1"
                onClick={() => navigate('/admin/weekly-assign')}
              >
                <RiCalendarCheckLine size={18} />
                <span>주간 배정 관리</span>
              </Button>
              <Button
                variant="outline-secondary"
                className="fw-bold px-3 py-2 d-flex align-items-center gap-1"
                onClick={() => navigate('/admin/records')}
              >
                <RiGroupLine size={18} />
                <span>전체 기록 조회</span>
              </Button>
            </div>
          </div>

          {/* 지점 선택 필터 */}
          <hr className="my-3 opacity-25" />
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted small fw-bold me-1">지점 선택:</span>
            <div className="branch-select-pills mb-0">
              {branches.map((b) => (
                <button
                  key={b.wpIdx}
                  type="button"
                  className={`branch-pill ${Number(selectedWpIdx) === Number(b.wpIdx) ? 'active' : ''}`}
                  onClick={() => setSelectedWpIdx(b.wpIdx)}
                >
                  <RiStore2Line className="me-1" />
                  {b.wpName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? <Loading /> : (
          <>
            <div style={{ minHeight: '500px', marginBottom: '2rem' }}>
              <AdminCalendar
                selectedBranch={selectedBranchName}
                selectedBranchIdx={selectedBranchIdx}
                selectedDate={selectedDate}
                onDateClick={(date) => setSelectedDate(date)}
              />
            </div>

            <Card className="border-0 shadow-sm rounded-4 mb-4">
              <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <RiTimeLine className="text-primary" />
                  {format(selectedDate, 'yyyy년 MM월 dd일')} 출근 명단
                </h5>
                <Badge bg="primary" className="px-3 py-1 rounded-pill">
                  출근 {dayHeadcount.total}명 · 피크 {dayHeadcount.peak}명
                </Badge>
              </Card.Header>
              <Card.Body className="p-0">
                {dailyLoading ? (
                  <div className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></div>
                ) : dailySchedule.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <RiGroupLine size={36} className="opacity-50 mb-2" />
                    <p className="mb-0">해당 날짜에 배정된 근무자가 없습니다.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="custom-table align-middle mb-0 text-center">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}>No.</th>
                          <th>근무자</th>
                          <th>출근 시간</th>
                          <th>상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailySchedule.map((ds, idx) => (
                          <tr key={ds.userIdx}>
                            <td className="text-muted fw-semibold">{idx + 1}</td>
                            <td>
                              <span className="fw-bold text-dark">{ds.userName || `사원 (${ds.userIdx})`}</span>
                              {Number(ds.nameSeq) > 1 && ds.userIdx != null && (
                                <Badge bg="secondary" className="ms-1">#{ds.userIdx}</Badge>
                              )}
                            </td>
                            <td>
                              <span className="badge bg-success text-white fw-bold px-3 py-2 rounded-pill fs-6 shadow-xs">
                                {ds.startTime ? ds.startTime : '-'}
                              </span>
                            </td>
                            <td>
                              <Badge bg="secondary" className="px-2 py-1">출근</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </>
        )}
      </Container>
    </div>
  );
};

export default AdminMain;
