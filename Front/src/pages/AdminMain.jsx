import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Container, ButtonGroup, ToggleButton, Card, Table, Button, Spinner, Badge } from 'react-bootstrap';
import { fetchWorkRecords, fetchDailySchedule } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import { parseISO, addDays, format } from 'date-fns';
import AdminCalendar from '../components/AdminCalendar';
import './AdminMain.css';

const parseDateString = (dateObj) => {
  if (!dateObj) return new Date();
  if (typeof dateObj === 'string') return parseISO(dateObj);
  if (Array.isArray(dateObj)) {
    const [y, m, d] = dateObj;
    return parseISO(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return new Date();
};

const AdminMain = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const defaultBranch = (user?.branch && user.branch.includes('약산돼지')) ? '약산돼지' : '노란돼지';
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  
  const [workRecords, setWorkRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailySchedule, setDailySchedule] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  const [branches, setBranches] = useState([{ name: '노란돼지', value: '노란돼지' }, { name: '약산돼지', value: '약산돼지' }]);

  const loadData = async () => {
    setLoading(true);
    const [recRes, branchRes] = await Promise.all([
      fetchWorkRecords(),
      fetchWorkPlaces()
    ]);
    if (recRes.success) setWorkRecords(recRes.data || []);
    if (branchRes.success) {
      setBranches(branchRes.data.map(b => ({ name: b.wpName, value: b.wpName, wpIdx: b.wpIdx })));
      // If selectedBranch is not in the list, set to first
      if (!branchRes.data.find(b => b.wpName === selectedBranch) && branchRes.data.length > 0) {
        setSelectedBranch(branchRes.data[0].wpName);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedBranchIdx = useMemo(() => {
    const branch = branches.find(b => b.name === selectedBranch);
    return branch ? branch.wpIdx : null; // Ensure you have wpIdx in branch objects
  }, [branches, selectedBranch]);

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
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-2">관리자 대시보드</h2>
            <div className="d-flex align-items-center gap-2 mb-0">
              <span className="text-muted fs-5">{user?.name}님, 환영합니다.</span>
              {user?.userType && <Badge bg="secondary" className="px-2 py-1">{user.userType}</Badge>}
              {user?.branch && <Badge bg="info" className="px-2 py-1">{user.branch}</Badge>}
            </div>
          </div>
          
          <div className="mt-3 mt-md-0">
            <ButtonGroup>
              {branches.map((b, idx) => (
                <ToggleButton
                  key={idx}
                  id={`branch-radio-${idx}`}
                  type="radio"
                  variant={selectedBranch === b.value ? "primary" : "outline-primary"}
                  name="branchRadio"
                  value={b.value}
                  checked={selectedBranch === b.value}
                  onChange={(e) => setSelectedBranch(e.currentTarget.value)}
                  className="px-4 fw-bold"
                >
                  {b.name}
                </ToggleButton>
              ))}
            </ButtonGroup>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <>
            <div className="d-flex justify-content-end mb-3">
              <Button variant="success" className="fw-bold px-4" onClick={() => navigate('/admin/weekly-assign')}>
                📅 주간 배정 관리
              </Button>
            </div>
            <div style={{ minHeight: '500px', marginBottom: '2rem' }}>
              <AdminCalendar 
                selectedBranch={selectedBranch} 
                selectedBranchIdx={selectedBranchIdx} 
                selectedDate={selectedDate}
                onDateClick={(date) => setSelectedDate(date)} 
              />
            </div>

            <Card className="border-0 shadow-sm rounded-4 mb-4">
              <Card.Header className="bg-white border-bottom-0 pt-4 pb-0 px-4">
                <h5 className="fw-bold mb-0 text-dark">
                  {format(selectedDate, 'yyyy년 MM월 dd일')} 출근 명단
                </h5>
              </Card.Header>
              <Card.Body className="p-4">
                {dailyLoading ? (
                  <div className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></div>
                ) : dailySchedule.length === 0 ? (
                  <div className="text-center text-muted py-4">배정된 근무자가 없습니다.</div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0 text-center">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '80px' }}>No.</th>
                          <th>근무자</th>
                          <th>출근 시간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailySchedule.map((ds, idx) => (
                          <tr key={ds.userIdx}>
                            <td className="text-muted">{idx + 1}</td>
                            <td><span className="fw-bold text-primary">{ds.userName || `사원 (${ds.userIdx})`}</span></td>
                            <td>
                              <span className="badge bg-success text-white fw-bold px-3 py-2 fs-6">
                                {ds.startTime ? ds.startTime : '-'}
                              </span>
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
