import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWorkRecordById, updateWorkRecord } from '../api/workApi';
import useAuthStore from '../store/useAuthStore';
import { FaChevronLeft, FaSave } from 'react-icons/fa';

const RecordEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [recDate, setRecDate] = useState('');
  const [startHour, setStartHour] = useState('18');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('22');
  const [endMin, setEndMin] = useState('00');
  const [restHour, setRestHour] = useState('00');
  const [restMin, setRestMin] = useState('00');
  const [remarks, setRemarks] = useState('');
  
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

  useEffect(() => {
    const loadRecord = async () => {
      const res = await fetchWorkRecordById(id);
      if (res.success && res.data) {
        setRecDate(res.data.wrDate || '');
        const st = parseLocalTime(res.data.wrStartTime);
        const et = parseLocalTime(res.data.wrEndTime);
        const rt = parseLocalTime(res.data.wrRestTime);
        setStartHour(String(st.hour).padStart(2, '0'));
        setStartMin(String(st.minute).padStart(2, '0'));
        setEndHour(String(et.hour).padStart(2, '0'));
        setEndMin(String(et.minute).padStart(2, '0'));
        setRestHour(String(rt.hour).padStart(2, '0'));
        setRestMin(String(rt.minute).padStart(2, '0'));
        setRemarks(res.data.wrRemarks || '');
      } else {
        alert(res.error || '기록을 불러오는데 실패했습니다.');
        navigate('/records');
      }
      setLoading(false);
    };
    loadRecord();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recDate) {
      alert('날짜를 선택해주세요.');
      return;
    }

    const startNum = parseInt(startHour, 10) + (parseInt(startMin, 10) / 60);
    let endNum = parseInt(endHour, 10) + (parseInt(endMin, 10) / 60);
    if (endNum < startNum) endNum += 24;
    const workNum = endNum - startNum;
    const restNum = parseInt(restHour, 10) + (parseInt(restMin, 10) / 60);

    if (restNum >= workNum) {
      alert('휴게 시간이 총 근무 시간 이상일 수 없습니다.');
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

    const res = await updateWorkRecord(id, recordData);
    if (res.success) {
      alert('근무 기록이 수정되었습니다.');
      navigate('/records');
    } else {
      alert(res.error || '근무 기록 수정에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="py-4 py-md-5" style={{ maxWidth: '600px' }}>
      <div className="d-flex align-items-center mb-4">
        <Button variant="link" className="text-dark p-0 me-3" onClick={() => navigate(-1)}>
          <FaChevronLeft size={24} />
        </Button>
        <h2 className="fw-bold text-dark mb-0">근무 기록 수정</h2>
      </div>

      <div className="glass-card rounded-4 p-4 p-md-5 shadow-sm">
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold text-muted small">근무 일자</Form.Label>
            <Form.Control 
              type="date" 
              value={recDate}
              onChange={(e) => setRecDate(e.target.value)}
              className="border-0 bg-light p-3 rounded-3"
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-bold text-muted small">시작 시간</Form.Label>
            <div className="d-flex gap-2 align-items-center">
              <Form.Select 
                value={startHour} 
                onChange={e => setStartHour(e.target.value)}
                className="border-0 bg-light p-3 rounded-3 flex-grow-1"
              >
                {[...Array(24)].map((_, i) => (
                  <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}시</option>
                ))}
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
            <Form.Label className="fw-bold text-muted small">비고 (선택)</Form.Label>
            <Form.Control 
              as="textarea"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="특이사항이 있다면 적어주세요."
              className="border-0 bg-light p-3 rounded-3"
            />
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100 p-3 rounded-3 fw-bold fs-5 shadow-sm d-flex align-items-center justify-content-center gap-2">
            <FaSave />
            수정 완료
          </Button>
        </Form>
      </div>
    </Container>
  );
};

export default RecordEdit;
