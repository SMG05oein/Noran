import React, { useState, useEffect, useMemo } from 'react';
import { Container, ButtonGroup, ToggleButton, Table, Button, Spinner, Form } from 'react-bootstrap';
import { fetchWorkRequests, updateWorkRequest, createWorkRequest } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import { parseISO, addDays, format, startOfWeek, endOfWeek, subWeeks, addWeeks, getWeekOfMonth } from 'date-fns';
import useAuthStore from '../store/useAuthStore';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './AdminMain.css';

const DAY_KEYS = [
  { key: 'wawIsMon', name: '월', offset: 0, timeKey: 'wawMonStartTime' },
  { key: 'wawIsTue', name: '화', offset: 1, timeKey: 'wawTueStartTime' },
  { key: 'wawIsWed', name: '수', offset: 2, timeKey: 'wawWedStartTime' },
  { key: 'wawIsThu', name: '목', offset: 3, timeKey: 'wawThuStartTime' },
  { key: 'wawIsFri', name: '금', offset: 4, timeKey: 'wawFriStartTime' },
  { key: 'wawIsSat', name: '토', offset: 5, timeKey: 'wawSatStartTime' },
  { key: 'wawIsSun', name: '일', offset: 6, timeKey: 'wawSunStartTime' },
];

const TIME_OPTIONS = [];
for (let h = 10; h <= 23; h++) {
  const hour = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hour}:00`);
  if (h < 23) TIME_OPTIONS.push(`${hour}:30`);
}

const formatTimeValue = (timeStr) => {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
};

const AdminWeeklyAssign = () => {
  const { user } = useAuthStore();
  const defaultBranch = (user?.branch && user.branch.includes('약산돼지')) ? '약산돼지' : '노란돼지1';
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState([{ name: '노란돼지', value: '노란돼지' }, { name: '약산돼지', value: '약산돼지' }]);
  
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [workRequests, setWorkRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const dateStr = format(currentWeekStart, 'yyyy-MM-dd');
    const [reqRes, branchRes] = await Promise.all([
      fetchWorkRequests(dateStr),
      fetchWorkPlaces()
    ]);
    
    if (reqRes.success) setWorkRequests(reqRes.data || []);
    if (branchRes.success) {
      setBranches(branchRes.data.map(b => ({ name: b.wpName, value: b.wpName })));
      if (!branchRes.data.find(b => b.wpName === selectedBranch) && branchRes.data.length > 0) {
        setSelectedBranch(branchRes.data[0].wpName);
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [currentWeekStart]);

  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));

  // 필터: 선택한 지점에 해당하는 요청들만 추출 (주차는 API에서 필터링됨)
  const weeklyRequests = useMemo(() => {
    return workRequests.filter(req => {
      if (req.workPlaceName && !req.workPlaceName.includes(selectedBranch)) return false;
      return true;
    });
  }, [workRequests, selectedBranch]);

  const handleTimeChange = (userIdx, timeKey, newTime) => {
    setWorkRequests(prev => prev.map(req => {
      if (req.userIdx === userIdx) {
        return { ...req, [timeKey]: newTime };
      }
      return req;
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const promises = [];
    
    weeklyRequests.forEach(req => {
      const payload = {
        wawDate: req.wawDate || format(currentWeekStart, 'yyyy-MM-dd'),
        wawIsMon: req.wawIsMon, wawIsTue: req.wawIsTue, wawIsWed: req.wawIsWed,
        wawIsThu: req.wawIsThu, wawIsFri: req.wawIsFri, wawIsSat: req.wawIsSat, wawIsSun: req.wawIsSun,
        wawMonStartTime: req.wawMonStartTime, wawTueStartTime: req.wawTueStartTime,
        wawWedStartTime: req.wawWedStartTime, wawThuStartTime: req.wawThuStartTime,
        wawFriStartTime: req.wawFriStartTime, wawSatStartTime: req.wawSatStartTime, wawSunStartTime: req.wawSunStartTime,
        wawRemarks: req.wawRemarks, userIdx: req.userIdx || 1
      };

      let hasTimeAssigned = false;
      DAY_KEYS.forEach(d => {
        const time = req[d.timeKey];
        // 시간이 입력되어 있으면 배정, 없으면 반려
        const newStatus = (time && time.trim() !== '') ? '배정' : '반려';
        payload[d.key] = newStatus;
        if (newStatus === '배정') {
          hasTimeAssigned = true;
        }
      });

      if (req.wawIdx != null) {
        promises.push(updateWorkRequest(req.wawIdx, payload));
      } else if (hasTimeAssigned) {
        // 미신청 상태(wawIdx가 null)인데 시간을 배정한 경우 신규 생성
        promises.push(createWorkRequest(payload));
      }
    });

    if (promises.length > 0) {
      const results = await Promise.all(promises);
      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        alert("성공적으로 저장되었습니다.");
        await loadData();
      } else {
        alert("일부 데이터를 저장하는 데 실패했습니다.");
      }
    } else {
      alert("저장할 데이터가 없습니다.");
    }
    setSaving(false);
  };

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  return (
    <div className="admin-container">
      <Container fluid className="py-4 py-md-5 px-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-2">주간 배정 관리</h2>
            <div className="d-flex align-items-center gap-3">
              <Button variant="link" onClick={handlePrevWeek} className="p-0 text-dark fs-5" disabled={loading}><FaChevronLeft /></Button>
              <h5 className="fw-bold mb-0">
                {format(currentWeekStart, 'M')}월 {getWeekOfMonth(currentWeekStart, { weekStartsOn: 1 })}주차
                <span className="text-muted ms-2 fs-6">({format(currentWeekStart, 'MM/dd')} ~ {format(currentWeekEnd, 'MM/dd')})</span>
              </h5>
              <Button variant="link" onClick={handleNextWeek} className="p-0 text-dark fs-5" disabled={loading}><FaChevronRight /></Button>
            </div>
          </div>
          
          <div className="mt-3 mt-md-0 d-flex gap-3">
            <Button variant="primary" className="fw-bold px-4" onClick={handleSaveAll} disabled={saving || loading}>
              {saving ? <Spinner size="sm" animation="border" /> : '저장'}
            </Button>
            <ButtonGroup>
              {branches.map((b, idx) => (
                <ToggleButton
                  key={idx}
                  id={`assign-branch-${idx}`}
                  type="radio"
                  variant={selectedBranch === b.value ? "primary" : "outline-primary"}
                  name="assignBranchRadio"
                  value={b.value}
                  checked={selectedBranch === b.value}
                  onChange={(e) => setSelectedBranch(e.currentTarget.value)}
                  className="px-4 fw-bold"
                  disabled={loading}
                >
                  {b.name}
                </ToggleButton>
              ))}
            </ButtonGroup>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <div className="bg-white rounded-4 shadow-sm border border-light overflow-hidden">
            <div className="table-responsive">
              <Table bordered hover className="mb-0 text-center align-middle" style={{ minWidth: '1000px' }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '150px' }} className="py-3">이름</th>
                    {DAY_KEYS.map(d => (
                      <th key={d.key} className="py-3" style={{ width: '120px' }}>
                        <div>{format(addDays(currentWeekStart, d.offset), 'MM/dd')}</div>
                        <div className={d.name === '일' ? 'text-danger' : d.name === '토' ? 'text-primary' : ''}>
                          ({d.name})
                        </div>
                      </th>
                    ))}
                    <th style={{ width: '200px' }} className="py-3">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-5 text-muted">이번 주 신청 내역이 없습니다.</td>
                    </tr>
                  ) : (
                    weeklyRequests.map(req => (
                      <tr key={req.userIdx}>
                        <td className="fw-bold bg-light">{req.userName || `사원(${req.userIdx})`}</td>
                        {DAY_KEYS.map(d => {
                          const status = req[d.key];
                          const time = formatTimeValue(req[d.timeKey]);
                          
                          return (
                            <td key={d.key} className={status === '미신청' || status === null ? 'bg-light opacity-75' : ''}>
                                <Form.Select 
                                  size="sm" 
                                  className={`fw-bold text-center shadow-none border ${time ? 'bg-primary bg-opacity-10 text-primary border-primary' : (status === '미신청' || status === null ? 'bg-secondary bg-opacity-10 text-secondary border-secondary' : 'bg-warning bg-opacity-10 text-warning border-warning')}`}
                                  value={time}
                                  onChange={(e) => handleTimeChange(req.userIdx, d.timeKey, e.target.value)}
                                  disabled={saving}
                                >
                                  <option value="" className="text-muted">
                                    {status === '미신청' || status === null ? '미신청' : '신청'}
                                  </option>
                                  {TIME_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </Form.Select>
                            </td>
                          );
                        })}
                        <td className="text-start small text-muted">{req.wawRemarks || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};

export default AdminWeeklyAssign;
