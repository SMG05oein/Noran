import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Badge, Form, Row, Col, Button, Modal } from 'react-bootstrap';
import { format, subMonths } from 'date-fns';
import { FaClock, FaCalendarCheck, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { fetchWorkRecords, createWorkRecord } from '../api/workApi';

const Records = () => {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [records, setRecords] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 폼 상태
  const [recDate, setRecDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startHour, setStartHour] = useState('18');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('22');
  const [endMin, setEndMin] = useState('00');
  const [restHour, setRestHour] = useState('00');
  const [restMin, setRestMin] = useState('00');
  const [remarks, setRemarks] = useState('');

  const loadRecords = async () => {
    const res = await fetchWorkRecords();
    if (res.success) {
      setRecords(res.data.content || res.data || []);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter(r => r.wrDate && r.wrDate.startsWith(selectedMonth));
  }, [selectedMonth, records]);

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

  // 총 근무시간 계산 로직 (간단히 시 단위 차이만 계산, 휴게시간 제외)
  const calculateTotalHours = (startRaw, endRaw, restRaw) => {
    if(!startRaw || !endRaw) return 0;
    const start = parseLocalTime(startRaw);
    const end = parseLocalTime(endRaw);
    const rest = restRaw ? parseLocalTime(restRaw) : { hour: 0, minute: 0 };
    
    const startNum = start.hour + (start.minute / 60);
    let endNum = end.hour + (end.minute / 60);
    // 밤을 샜을 경우(익일 퇴근) 처리
    if (endNum < startNum) endNum += 24;
    
    const restNum = rest.hour + (rest.minute / 60);
    
    return Math.max(0, endNum - startNum - restNum);
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    setLoading(true);

    const startNum = parseInt(startHour, 10) + (parseInt(startMin, 10) / 60);
    let endNum = parseInt(endHour, 10) + (parseInt(endMin, 10) / 60);
    if (endNum < startNum) endNum += 24;
    const workNum = endNum - startNum;
    const restNum = parseInt(restHour, 10) + (parseInt(restMin, 10) / 60);

    if (restNum >= workNum) {
      alert('휴게 시간이 총 근무 시간 이상일 수 없습니다.');
      setLoading(false);
      return;
    }

    const recordData = {
      wrDate: recDate,
      wrStartTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
      wrEndTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
      wrRestTime: `${String(restHour).padStart(2, '0')}:${String(restMin).padStart(2, '0')}`,
      wrRemarks: remarks,
      userIdx: user?.userIdx || 1
    };

    const res = await createWorkRecord(recordData);
    setLoading(false);

    if (res.success) {
      alert('근무 기록이 추가되었습니다.');
      setShowModal(false);
      loadRecords();
    } else {
      alert(res.error || '근무 기록 추가에 실패했습니다.');
    }
  };

  return (
    <Container className="py-4 py-md-5 mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark mb-0">근무 기록</h2>
        <Button 
          variant="primary" 
          className="rounded-circle shadow-sm d-flex justify-content-center align-items-center"
          style={{ width: '45px', height: '45px', backgroundColor: '#d35400', border: 'none' }}
          onClick={() => setShowModal(true)}
        >
          <FaPlus />
        </Button>
      </div>

      <div className="d-flex justify-content-end mb-4">
        <Form.Select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-auto shadow-sm border-0 fw-bold text-primary"
          style={{ borderRadius: '12px' }}
        >
          {[...Array(6)].map((_, i) => {
            const d = subMonths(new Date(), i);
            const val = format(d, 'yyyy-MM');
            return <option key={val} value={val}>{format(d, 'yyyy년 M월')}</option>;
          })}
        </Form.Select>
      </div>

      <Row className="mb-4">
        <Col xs={6}>
          <Card className="border-0 shadow-sm rounded-4 text-center p-3 h-100" style={{ background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' }}>
            <h6 className="text-muted fw-bold mb-2">이번 달 근무일</h6>
            <h3 className="fw-bold text-primary mb-0">{filteredRecords.length}일</h3>
          </Card>
        </Col>
        <Col xs={6}>
          <Card className="border-0 shadow-sm rounded-4 text-center p-3 h-100" style={{ background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' }}>
            <h6 className="text-muted fw-bold mb-2">누적 근무시간</h6>
            <h3 className="fw-bold text-success mb-0">
              {filteredRecords.reduce((acc, r) => acc + calculateTotalHours(r.wrStartTime, r.wrEndTime), 0).toFixed(1)}H
            </h3>
          </Card>
        </Col>
      </Row>

      <div className="d-flex flex-column gap-3">
        {filteredRecords.length === 0 ? (
          <div className="text-center text-muted py-5">
            <FaCalendarCheck size={40} className="mb-3 opacity-50" />
            <p>해당 월의 근무 기록이 없습니다.</p>
          </div>
        ) : (
          filteredRecords.map(record => {
            const st = parseLocalTime(record.wrStartTime);
            const et = parseLocalTime(record.wrEndTime);
            const sh = String(st.hour).padStart(2, '0');
            const sm = String(st.minute).padStart(2, '0');
            const eh = String(et.hour).padStart(2, '0');
            const em = String(et.minute).padStart(2, '0');
            const rt = record.wrRestTime ? parseLocalTime(record.wrRestTime) : null;
            const totalHours = calculateTotalHours(record.wrStartTime, record.wrEndTime, record.wrRestTime).toFixed(1);

            return (
              <Card key={record.wrIdx} className="border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="d-flex" style={{ borderLeft: `6px solid #2ecc71` }}>
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold fs-5">{record.wrDate}</span>
                      <Badge bg="success" className="px-2 py-1">완료</Badge>
                    </div>
                    <div className="d-flex justify-content-between text-muted align-items-center" style={{ fontSize: '0.95rem' }}>
                      <div className="d-flex align-items-center gap-1">
                        <FaClock /> {sh}:{sm} - {eh}:{em}
                      </div>
                      <div className="fw-bold text-dark">
                        {totalHours}시간
                      </div>
                    </div>
                    {rt && (rt.hour > 0 || rt.minute > 0) && (
                      <div className="text-muted small mt-1">
                        휴게: {rt.hour}시간 {rt.minute > 0 ? `${rt.minute}분` : ''}
                      </div>
                    )}
                    {record.wrRemarks && (
                      <div className="mt-2 text-muted small">비고: {record.wrRemarks}</div>
                    )}
                    <Button variant="outline-secondary" size="sm" className="rounded-pill fw-bold px-3 mt-3" onClick={() => navigate(`/records/edit/${record.wrIdx}`)}>
                      수정
                    </Button>
                  </Card.Body>
                </div>
              </Card>
            )
          })
        )}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">새 근무 기록 추가</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddRecord}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">근무 날짜</Form.Label>
              <Form.Control type="date" value={recDate} onChange={e=>setRecDate(e.target.value)} required />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small">출근 시간</Form.Label>
              <div className="d-flex gap-2 align-items-center">
                <Form.Select value={startHour} onChange={e=>setStartHour(e.target.value)} className="border-0 bg-light p-3 rounded-3 flex-grow-1">
                  {[...Array(24)].map((_,i) => <option key={i} value={String(i).padStart(2,'0')}>{String(i).padStart(2,'0')}시</option>)}
                </Form.Select>
                <span className="fw-bold text-muted">:</span>
                <Form.Select 
                  value={startMin} 
                  onChange={e => setStartMin(e.target.value)}
                  className="border-0 bg-light p-3 rounded-3 flex-grow-1"
                >
                  {['00', '30'].map(m => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </Form.Select>
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small">종료 시간</Form.Label>
              <div className="d-flex gap-2 align-items-center">
                <Form.Select 
                  value={endHour} 
                  onChange={e => setEndHour(e.target.value)}
                  className="border-0 bg-light p-3 rounded-3 flex-grow-1"
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}시</option>
                  ))}
                </Form.Select>
                <span className="fw-bold text-muted">:</span>
                <Form.Select 
                  value={endMin} 
                  onChange={e => setEndMin(e.target.value)}
                  className="border-0 bg-light p-3 rounded-3 flex-grow-1"
                >
                  {['00', '30'].map(m => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </Form.Select>
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small">휴게 시간</Form.Label>
              <div className="d-flex gap-2 align-items-center">
                <Form.Select 
                  value={restHour} 
                  onChange={e => setRestHour(e.target.value)}
                  className="border-0 bg-light p-3 rounded-3 flex-grow-1"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}시간</option>
                  ))}
                </Form.Select>
                <span className="fw-bold text-muted">:</span>
                <Form.Select 
                  value={restMin} 
                  onChange={e => setRestMin(e.target.value)}
                  className="border-0 bg-light p-3 rounded-3 flex-grow-1"
                >
                  {['00', '30'].map(m => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </Form.Select>
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small">비고</Form.Label>
              <Form.Control type="text" value={remarks} onChange={e=>setRemarks(e.target.value)} />
            </Form.Group>

            <Button disabled={loading} variant="primary" type="submit" className="w-100 fw-bold" style={{ backgroundColor: '#d35400', border: 'none' }}>
              기록 저장
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

    </Container>
  );
};

export default Records;
