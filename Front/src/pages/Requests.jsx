import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Badge } from 'react-bootstrap';
import { format, startOfWeek, addDays } from 'date-fns';
import { RiCalendarTodoLine, RiFileList3Line, RiCheckboxCircleLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { fetchWorkRequests, createWorkRequest } from '../api/workApi';

const Requests = () => {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  
  // 기본 신청일을 '다음 주 월요일'로 설정
  const defaultNextMonday = format(startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const [reqDate, setReqDate] = useState(defaultNextMonday);
  
  const [remarks, setRemarks] = useState('');
  
  const [days, setDays] = useState({
    Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false
  });

  const [requestList, setRequestList] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRequests = async () => {
    const res = await fetchWorkRequests();
    if (res.success) {
      setRequestList(res.data);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDayToggle = (day) => {
    setDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const handleSelectAll = () => {
    setDays({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: true });
  };

  const handleWeekdaysOnly = () => {
    setDays({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false });
  }; 

  const handleWeekendsOnly = () => {
    setDays({ Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: true, Sun: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Object.values(days).some(v => v)) {
      alert('신청할 요일을 하나 이상 선택해주세요.');
      return;
    }

    setLoading(true);
    const mondayDate = format(startOfWeek(new Date(reqDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const requestData = {
      wawDate: mondayDate,
      wawIsMon: days.Mon ? '신청' : '미신청',
      wawIsTue: days.Tue ? '신청' : '미신청',
      wawIsWed: days.Wed ? '신청' : '미신청',
      wawIsThu: days.Thu ? '신청' : '미신청',
      wawIsFri: days.Fri ? '신청' : '미신청',
      wawIsSat: days.Sat ? '신청' : '미신청',
      wawIsSun: days.Sun ? '신청' : '미신청',
      wawRemarks: remarks,
      userIdx: user?.userIdx || 1
    };

    const res = await createWorkRequest(requestData);
    setLoading(false);
    
    if (res.success) {
      alert('근무 신청이 완료되었습니다.');
      setDays({ Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false });
      setRemarks('');
      loadRequests();
    } else {
      alert(res.error || '근무 신청에 실패했습니다.');
    }
  };

  const dayLabels = { Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토', Sun: '일' };

  const formatDateTime = (dt) => {
    if (!dt) return '-';
    if (Array.isArray(dt)) {
      return `${dt[0]}-${String(dt[1]).padStart(2, '0')}-${String(dt[2]).padStart(2, '0')} ${String(dt[3]||0).padStart(2, '0')}:${String(dt[4]||0).padStart(2, '0')}`;
    }
    return new Date(dt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Container className="py-4 py-md-5 mb-5">
      <h2 className="fw-bold text-dark mb-4">근무 신청</h2>
      
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold fs-5">
            <RiCalendarTodoLine /> 신규 근무 신청
          </div>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">신청 기준일 (시작일)</Form.Label>
              <Form.Control 
                type="date" 
                value={reqDate} 
                className="border-0 shadow-sm p-3 rounded-3 fw-bold text-muted"
                style={{ backgroundColor: 'var(--color-input-bg)', cursor: 'not-allowed' }}
                readOnly
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small d-block">신청 요일 선택</Form.Label>
              <div className="d-flex flex-nowrap overflow-auto pb-2 gap-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                {Object.keys(days).map(day => (
                  <Button 
                    key={day}
                    variant={days[day] ? 'primary' : 'outline-secondary'}
                    className={`rounded-circle fw-bold shadow-sm flex-shrink-0`}
                    style={{ width: '38px', height: '38px', fontSize: '0.85rem', padding: '0', backgroundColor: days[day] ? 'var(--color-primary)' : '', borderColor: days[day] ? 'var(--color-primary)' : '' }}
                    onClick={() => handleDayToggle(day)}
                  >
                    {dayLabels[day]}
                  </Button>
                ))}
              </div>
              <div className="d-flex gap-2 mt-2">
                <Button variant="outline-secondary" size="sm" onClick={handleSelectAll} className="rounded-pill fw-bold">모두선택</Button>
                <Button variant="outline-secondary" size="sm" onClick={handleWeekdaysOnly} className="rounded-pill fw-bold">평일만</Button>
                <Button variant="outline-secondary" size="sm" onClick={handleWeekendsOnly} className="rounded-pill fw-bold">주말만</Button>
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small">비고 (선택)</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="추가 요청사항을 입력하세요"
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)} 
                className="border-0 shadow-sm p-3 rounded-3"
                style={{ backgroundColor: 'var(--color-input-bg)' }}
              />
            </Form.Group>

            <Button disabled={loading} variant="primary" type="submit" className="w-100 py-3 rounded-3 fw-bold shadow-sm">
              {loading ? '신청 중...' : '근무 신청하기'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <div className="d-flex align-items-center gap-2 mb-3 text-dark fw-bold fs-5 mt-5">
        <RiFileList3Line /> 내 신청 내역
      </div>
      
      <div className="d-flex flex-column gap-3">
        {requestList.length === 0 ? (
          <div className="text-center text-muted py-5">
            신청 내역이 없습니다.
          </div>
        ) : (
          requestList.map(req => (
            <Card key={req.wawIdx} className="border-0 shadow-sm mb-3">
              <Card.Body className="p-4 d-flex justify-content-between align-items-start">
                <div>
                  <div className="fw-bold fs-5 text-dark mb-1">신청 주차: {req.wawDate} (월)</div>
                  <div className="text-muted small mb-1">
                    <div>신청일시: {formatDateTime(req.wawCreatedAt)}</div>
                    {req.wawUpdatedAt && req.wawUpdatedAt !== req.wawCreatedAt && (
                      <div>수정일시: {formatDateTime(req.wawUpdatedAt)}</div>
                    )}
                  </div>
                  <div className="text-muted small mb-2">{req.wawRemarks || '특이사항 없음'}</div>
                  <div className="d-flex gap-1">
                    {['신청', '배정'].includes(req.wawIsMon) && <Badge bg="primary">월</Badge>}
                    {['신청', '배정'].includes(req.wawIsTue) && <Badge bg="primary">화</Badge>}
                    {['신청', '배정'].includes(req.wawIsWed) && <Badge bg="primary">수</Badge>}
                    {['신청', '배정'].includes(req.wawIsThu) && <Badge bg="primary">목</Badge>}
                    {['신청', '배정'].includes(req.wawIsFri) && <Badge bg="primary">금</Badge>}
                    {['신청', '배정'].includes(req.wawIsSat) && <Badge bg="primary">토</Badge>}
                    {['신청', '배정'].includes(req.wawIsSun) && <Badge bg="primary">일</Badge>}
                  </div>
                </div>
                <Button variant="outline-secondary" size="sm" className="rounded-pill fw-bold px-3" onClick={() => navigate(`/requests/edit/${req.wawIdx}`)}>
                  수정
                </Button>
              </Card.Body>
            </Card>
          ))
        )}
      </div>
    </Container>
  );
};

export default Requests;
