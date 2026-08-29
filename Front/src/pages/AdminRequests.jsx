import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Table, Button, Spinner, Badge, Modal, Form } from 'react-bootstrap';
import { fetchWorkRequests, updateWorkRequest } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import useAuthStore from '../store/authStore';
import { parseISO, addDays, format, getWeekOfMonth } from 'date-fns';
import { RiStore2Line, RiFileList3Line } from 'react-icons/ri';
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

const DAY_KEYS = [
  { key: 'wawIsMon', name: '월', offset: 0 },
  { key: 'wawIsTue', name: '화', offset: 1 },
  { key: 'wawIsWed', name: '수', offset: 2 },
  { key: 'wawIsThu', name: '목', offset: 3 },
  { key: 'wawIsFri', name: '금', offset: 4 },
  { key: 'wawIsSat', name: '토', offset: 5 },
  { key: 'wawIsSun', name: '일', offset: 6 },
];

const statusColor = { '신청': 'warning', '배정': 'success', '미배정': 'danger', '미신청': 'secondary', '타지점근무': 'info' };
const statusText = { '신청': '신청', '배정': '배정', '미배정': '미배정', '미신청': '미신청', '타지점근무': '타지점' };

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

const AdminRequests = () => {
  const { user } = useAuthStore();
  const [selectedWpIdx, setSelectedWpIdx] = useState(user?.workPlaceIdx || null);
  const [branches, setBranches] = useState([]);
  const [workRequests, setWorkRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [saving, setSaving] = useState(false);

  const currentBranchObj = useMemo(() => {
    if (branches.length === 0) return null;
    return branches.find(b => Number(b.wpIdx) === Number(selectedWpIdx)) || branches[0];
  }, [branches, selectedWpIdx]);

  const selectedBranchName = currentBranchObj?.wpName || user?.branch || '지점';

  const loadData = async () => {
    setLoading(true);
    const [reqRes, branchRes] = await Promise.all([
      fetchWorkRequests(),
      fetchWorkPlaces()
    ]);
    if (branchRes.success && branchRes.data) {
      setBranches(branchRes.data);
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
    if (reqRes.success) setWorkRequests(reqRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredRequests = useMemo(() => {
    return workRequests.filter(req => {
      if (req.workPlaceIdx != null && currentBranchObj?.wpIdx != null) {
        return Number(req.workPlaceIdx) === Number(currentBranchObj.wpIdx);
      }
      return !req.workPlaceName || req.workPlaceName === selectedBranchName;
    });
  }, [workRequests, currentBranchObj, selectedBranchName]);

  const handleBatchApprove = async (newStatus) => {
    if (selectedDays.length === 0) return;
    const req = selectedReq;
    const payload = {
      wawDate: req.wawDate,
      wawIsMon: req.wawIsMon, wawIsTue: req.wawIsTue, wawIsWed: req.wawIsWed,
      wawIsThu: req.wawIsThu, wawIsFri: req.wawIsFri, wawIsSat: req.wawIsSat,
      wawIsSun: req.wawIsSun,
      wawMonStartTime: req.wawMonStartTime, wawTueStartTime: req.wawTueStartTime,
      wawWedStartTime: req.wawWedStartTime, wawThuStartTime: req.wawThuStartTime,
      wawFriStartTime: req.wawFriStartTime, wawSatStartTime: req.wawSatStartTime,
      wawSunStartTime: req.wawSunStartTime,
      wawRemarks: req.wawRemarks, userIdx: req.userIdx || 1
    };
    selectedDays.forEach(dayKey => {
      payload[dayKey] = newStatus;
    });
    setSaving(true);
    const res = await updateWorkRequest(req.wawIdx, payload);
    setSaving(false);
    if (res.success) {
      alert(`선택한 요일의 상태가 [${newStatus}]로 변경되었습니다.`);
      setSelectedReq(null);
      setSelectedDays([]);
      loadData();
    } else {
      alert(res.error || '상태 변경에 실패했습니다.');
    }
  };

  const formatWawDate = (wawDate) =>
    Array.isArray(wawDate)
      ? `${wawDate[0]}-${String(wawDate[1]).padStart(2, '0')}-${String(wawDate[2]).padStart(2, '0')}`
      : wawDate;

  return (
    <div className="admin-container">
      <Container className="py-4 py-md-5">
        <div className="admin-header-card mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h2 className="fw-bold text-dark mb-1">근무 신청 관리</h2>
              <p className="text-muted small mb-0">직원들이 제출한 요일별 근무 희망 일정을 확인하고 배정 상태를 변경합니다.</p>
            </div>
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

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Body className="p-0">
              {filteredRequests.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <RiFileList3Line size={36} className="opacity-50 mb-2" />
                  <p className="mb-0">신청 내역이 없습니다.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="custom-table align-middle mb-0 text-center">
                    <thead>
                      <tr>
                        <th>신청자</th>
                        <th>주차 (월)</th>
                        <th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th><th>일</th>
                        <th>비고</th>
                        <th>상세</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map(req => (
                        <tr key={req.wawIdx}>
                          <td><span className="fw-bold text-primary">{req.userName || `사원(${req.userIdx})`}</span></td>
                          <td className="text-muted small">{formatWawDate(req.wawDate)}</td>
                          {DAY_KEYS.map(d => (
                            <td key={d.key}>
                              <Badge bg={statusColor[req[d.key]] || 'secondary'} className={req[d.key] === '미신청' ? "text-dark" : "text-white"}>
                                {statusText[req[d.key]] || req[d.key]}
                              </Badge>
                            </td>
                          ))}
                          <td className="text-muted small">{req.wawRemarks || '-'}</td>
                          <td>
                            <Button size="sm" variant="outline-primary" className="rounded-pill fw-bold px-3"
                              onClick={() => {
                                setSelectedReq(req);
                                setSelectedDays([]);
                              }}>
                              처리
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        )}
      </Container>

      {/* 상세 처리 모달 */}
      <Modal show={!!selectedReq} onHide={() => setSelectedReq(null)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold text-dark fs-5 d-flex align-items-center gap-2">
            <Badge bg="primary" className="fs-6 px-3 py-1">{selectedReq?.userName}</Badge>
            <span>{selectedReq ? `${format(parseDateString(selectedReq.wawDate), 'M')}월 ${getWeekOfMonth(parseDateString(selectedReq.wawDate), { weekStartsOn: 1 })}주차 신청` : ''}</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedReq && (
            <div>
              {DAY_KEYS.map(d => {
                const status = selectedReq[d.key];
                const monday = parseDateString(selectedReq.wawDate);
                const targetDate = addDays(monday, d.offset);
                return (
                  <div key={d.key} className="d-flex align-items-center py-2 border-bottom">
                    <Form.Check
                      type="checkbox"
                      id={`chk-${selectedReq.wawIdx}-${d.key}`}
                      className="me-3"
                      checked={selectedDays.includes(d.key)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedDays([...selectedDays, d.key]);
                        else setSelectedDays(selectedDays.filter(k => k !== d.key));
                      }}
                    />
                    <label htmlFor={`chk-${selectedReq.wawIdx}-${d.key}`} className="fw-bold me-auto mb-0" style={{ cursor: 'pointer' }}>
                      {format(targetDate, 'MM/dd')} ({d.name})
                    </label>
                    <Form.Select
                      size="sm"
                      className="custom-input py-1 mx-2"
                      style={{ width: '110px' }}
                      value={formatTimeValue(selectedReq[d.key.replace('Is', '') + 'StartTime'])}
                      onChange={(e) => {
                        const timeKey = d.key.replace('Is', '') + 'StartTime';
                        setSelectedReq({ ...selectedReq, [timeKey]: e.target.value });
                      }}
                    >
                      <option value="">시간 선택</option>
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </Form.Select>
                    <Badge bg={statusColor[status] || 'secondary'} className="text-white px-3 py-2 text-center" style={{ width: '75px' }}>
                      {statusText[status]}
                    </Badge>
                  </div>
                );
              })}
              <div className="mt-3 text-muted small p-2 rounded-3 bg-light">
                <strong>비고:</strong> {selectedReq.wawRemarks || '없음'}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="me-auto text-muted small fw-bold">
            선택: <span className="text-primary">{selectedDays.length}일</span>
          </div>
          <Button size="sm" variant="primary" className="rounded-3 px-3 fw-bold" disabled={saving || selectedDays.length === 0} onClick={() => handleBatchApprove('배정')}>배정</Button>
          <Button size="sm" variant="outline-danger" className="rounded-3 px-3 fw-bold" disabled={saving || selectedDays.length === 0} onClick={() => handleBatchApprove('미배정')}>미배정</Button>
          <Button size="sm" variant="outline-secondary" className="rounded-3 px-3 fw-bold" disabled={saving || selectedDays.length === 0} onClick={() => handleBatchApprove('신청')}>신청으로</Button>
          <Button size="sm" variant="secondary" className="rounded-3" onClick={() => setSelectedReq(null)}>닫기</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminRequests;
