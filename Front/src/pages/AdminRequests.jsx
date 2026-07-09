import React, { useState, useEffect, useMemo } from 'react';
import { Container, ButtonGroup, ToggleButton, Card, Table, Button, Spinner, Badge, Modal, Form } from 'react-bootstrap';
import { fetchWorkRequests, updateWorkRequest } from '../api/workApi';
import { parseISO, addDays, format, getWeekOfMonth } from 'date-fns';
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

const statusColor = { '신청': 'warning', '배정': 'success', '반려': 'danger', '미신청': 'secondary' };
const statusText = { '신청': '신청', '배정': '배정', '반려': '미배정', '미신청': '미신청' };

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
  const [selectedBranch, setSelectedBranch] = useState('노란돼지');
  const [workRequests, setWorkRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [saving, setSaving] = useState(false);

  const branches = [
    { name: '노란돼지', value: '노란돼지' },
    { name: '약산돼지', value: '약산돼지' },
  ];

  const loadData = async () => {
    setLoading(true);
    const res = await fetchWorkRequests();
    if (res.success) setWorkRequests(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredRequests = useMemo(() => {
    return workRequests.filter(req =>
      !req.workPlaceName || req.workPlaceName.includes(selectedBranch)
    );
  }, [workRequests, selectedBranch]);

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
      loadData();
      setSelectedReq(null);
    } else {
      alert(res.error || '처리에 실패했습니다.');
    }
  };

  const formatWawDate = (wawDate) =>
    Array.isArray(wawDate)
      ? `${wawDate[0]}-${String(wawDate[1]).padStart(2, '0')}-${String(wawDate[2]).padStart(2, '0')}`
      : wawDate;

  return (
    <div className="admin-container">
      <Container className="py-4 py-md-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
          <h2 className="fw-bold text-dark mb-2 mb-md-0">근무 신청 관리</h2>
          <ButtonGroup>
            {branches.map((b, idx) => (
              <ToggleButton
                key={idx}
                id={`req-branch-${idx}`}
                type="radio"
                variant={selectedBranch === b.value ? "primary" : "outline-primary"}
                name="reqBranchRadio"
                value={b.value}
                checked={selectedBranch === b.value}
                onChange={e => setSelectedBranch(e.currentTarget.value)}
                className="px-4 fw-bold"
              >
                {b.name}
              </ToggleButton>
            ))}
          </ButtonGroup>
        </div>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="p-4">
              {filteredRequests.length === 0 ? (
                <div className="text-center text-muted py-5">신청 내역이 없습니다.</div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0">
                    <thead className="table-light">
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
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <Badge bg="primary" className="fs-5">{selectedReq?.userName}</Badge> - {selectedReq ? `${format(parseDateString(selectedReq.wawDate), 'M')}월 ${getWeekOfMonth(parseDateString(selectedReq.wawDate), { weekStartsOn: 1 })}주차` : ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
                      className="mx-2 text-muted"
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
              <div className="mt-3 text-muted small">
                <strong>비고:</strong> {selectedReq.wawRemarks || '없음'}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="me-auto text-muted small">
            선택됨: {selectedDays.length}일
          </div>
          <Button size="sm" variant="primary" disabled={saving || selectedDays.length === 0} onClick={() => handleBatchApprove('배정')}>배정</Button>
          <Button size="sm" variant="outline-danger" disabled={saving || selectedDays.length === 0} onClick={() => handleBatchApprove('반려')}>미배정</Button>
          <Button size="sm" variant="outline-secondary" disabled={saving || selectedDays.length === 0} onClick={() => handleBatchApprove('신청')}>신청으로</Button>
          <Button size="sm" variant="secondary" onClick={() => setSelectedReq(null)}>닫기</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminRequests;
