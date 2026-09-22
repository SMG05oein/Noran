import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Spinner, Card } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchWorkRecordById, updateWorkRecord } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import useAuthStore from '../store/useAuthStore';
import { RiArrowLeftSLine, RiSave3Line } from 'react-icons/ri';
import Loading from '../components/Loading';

const RecordEdit = () => {
  const location = useLocation();
  const id = location.state?.id;
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
  const [workPlaceIdx, setWorkPlaceIdx] = useState(String(user?.workPlaceIdx || ''));
  const [branches, setBranches] = useState([]);
  const [editableUntil, setEditableUntil] = useState('');
  const [isEditable, setIsEditable] = useState(true);

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
    if (!id) {
      alert('잘못된 접근입니다.');
      navigate('/records');
      return;
    }
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
        const until = res.data.editableUntil || res.data.wrEditableUntil || '';
        setEditableUntil(until);
        setIsEditable(res.data.isEditable !== false && res.data.isEditable !== 0);
        if (res.data.workPlaceIdx) {
          setWorkPlaceIdx(String(res.data.workPlaceIdx));
        } else if (user?.workPlaceIdx) {
          setWorkPlaceIdx(String(user.workPlaceIdx));
        }
      } else {
        alert(res.error || '기록을 불러오는데 실패했습니다.');
        navigate('/records');
      }
      setLoading(false);
    };
    loadRecord();
  }, [id, navigate]);

  useEffect(() => {
    fetchWorkPlaces().then(res => {
      if (res.success && res.data) {
        setBranches(res.data);
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditable) {
      alert('수정 기한이 지났습니다. 급여 담당자에게 직접 연락하세요.');
      return;
    }
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
      userIdx: user?.userIdx || 1,
      workPlaceIdx: workPlaceIdx || user?.workPlaceIdx
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
      <Container style={{ minHeight: '60vh' }}><Loading /></Container>
    );
  }

  return (
    <Container className="py-4 py-md-5" style={{ maxWidth: '560px' }}>
      <div className="d-flex align-items-center mb-4 gap-2">
        <Button variant="outline-secondary" className="rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => navigate(-1)}>
          <RiArrowLeftSLine size={20} />
        </Button>
        <h2 className="fw-bold text-dark mb-0 fs-3">근무 기록 수정</h2>
      </div>

      <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <div className="fw-bold text-muted small mb-2">
                수정 가능 일자:{' '}
                {editableUntil
                  ? `${String(editableUntil).slice(0, 10)} 23:59까지`
                  : '-'}
                {!isEditable && <span className="text-danger ms-2">(기한 만료)</span>}
              </div>
              <Form.Label className="fw-bold text-muted small">근무지</Form.Label>
              <Form.Select value={workPlaceIdx} onChange={e => setWorkPlaceIdx(e.target.value)} className="custom-input" disabled={!isEditable}>
                {branches.map(b => (
                  <option key={b.wpIdx} value={String(b.wpIdx)}>{b.wpName}{String(b.wpIdx) === String(user?.workPlaceIdx) ? ' (내 지점)' : ''}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">근무 일자</Form.Label>
              <Form.Control 
                type="date" 
                value={recDate}
                onChange={(e) => setRecDate(e.target.value)}
                className="custom-input"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">출근 시간</Form.Label>
              <div className="d-flex gap-2 align-items-center">
                <Form.Select 
                  value={startHour} 
                  onChange={e => setStartHour(e.target.value)}
                  className="custom-input flex-grow-1"
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}시</option>
                  ))}
                </Form.Select>
                <span className="fw-bold text-muted">:</span>
                <Form.Select 
                  value={startMin} 
                  onChange={e => setStartMin(e.target.value)}
                  className="custom-input flex-grow-1"
                >
                  {['00', '30'].map(m => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </Form.Select>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">퇴근 시간</Form.Label>
              <div className="d-flex gap-2 align-items-center">
                <Form.Select 
                  value={endHour} 
                  onChange={e => setEndHour(e.target.value)}
                  className="custom-input flex-grow-1"
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}시</option>
                  ))}
                </Form.Select>
                <span className="fw-bold text-muted">:</span>
                <Form.Select 
                  value={endMin} 
                  onChange={e => setEndMin(e.target.value)}
                  className="custom-input flex-grow-1"
                >
                  {['00', '30'].map(m => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </Form.Select>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">휴게 시간</Form.Label>
              <div className="d-flex gap-2 align-items-center">
                <Form.Select 
                  value={restHour} 
                  onChange={e => setRestHour(e.target.value)}
                  className="custom-input flex-grow-1"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}시간</option>
                  ))}
                </Form.Select>
                <span className="fw-bold text-muted">:</span>
                <Form.Select 
                  value={restMin} 
                  onChange={e => setRestMin(e.target.value)}
                  className="custom-input flex-grow-1"
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
                className="custom-input"
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100 py-3 rounded-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2">
              <RiSave3Line size={18} />
              수정 완료
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default RecordEdit;
