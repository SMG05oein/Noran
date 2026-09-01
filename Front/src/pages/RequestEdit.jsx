import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Spinner, Card } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWorkApplyById, updateWorkApply } from '../api/workApi';
import useAuthStore from '../store/useAuthStore';
import { RiArrowLeftSLine, RiSave3Line } from 'react-icons/ri';
import { format, startOfWeek } from 'date-fns';
import Loading from '../components/Loading';

const RequestEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [reqDate, setReqDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [createdAt, setCreatedAt] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [days, setDays] = useState({
    Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false
  });

  const dayLabels = { Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토', Sun: '일' };

  useEffect(() => {
    const loadRequest = async () => {
      const res = await fetchWorkApplyById(id);
      if (res.success && res.data) {
        setReqDate(res.data.wawDate || '');
        setDays({
          Mon: ['신청', '배정', '수락'].includes(res.data.wawIsMon),
          Tue: ['신청', '배정', '수락'].includes(res.data.wawIsTue),
          Wed: ['신청', '배정', '수락'].includes(res.data.wawIsWed),
          Thu: ['신청', '배정', '수락'].includes(res.data.wawIsThu),
          Fri: ['신청', '배정', '수락'].includes(res.data.wawIsFri),
          Sat: ['신청', '배정', '수락'].includes(res.data.wawIsSat),
          Sun: ['신청', '배정', '수락'].includes(res.data.wawIsSun),
        });
        setRemarks(res.data.wawRemarks || '');
        setCreatedAt(res.data.wawCreatedAt);
        setUpdatedAt(res.data.wawUpdatedAt);
      } else {
        alert(res.error || '신청 내역을 불러오는데 실패했습니다.');
        navigate('/requests');
      }
      setLoading(false);
    };
    loadRequest();
  }, [id, navigate]);

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
    if (!reqDate) {
      alert('기준일(주차)을 선택해주세요.');
      return;
    }
    if (!Object.values(days).some(v => v)) {
      alert('신청할 요일을 최소 하루 이상 선택해주세요.');
      return;
    }

    // 무조건 선택한 날짜가 속한 주차의 '월요일'로 변환
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
      wawRemarks: remarks
    };

    const res = await updateWorkApply(id, requestData);
    if (res.success) {
      alert('근무 신청이 수정되었습니다.');
      navigate('/requests');
    } else {
      alert(res.error || '근무 신청 수정에 실패했습니다.');
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
        <h2 className="fw-bold text-dark mb-0 fs-3">근무 신청 수정</h2>
      </div>

      <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <div className="mb-4 text-end text-muted small">
              <div>최초 신청: {
                createdAt
                  ? (Array.isArray(createdAt)
                    ? `${createdAt[0]}-${String(createdAt[1]).padStart(2, '0')}-${String(createdAt[2]).padStart(2, '0')} ${String(createdAt[3] || 0).padStart(2, '0')}:${String(createdAt[4] || 0).padStart(2, '0')}`
                    : new Date(createdAt).toLocaleString('ko-KR'))
                  : '-'
              }</div>
              {updatedAt && updatedAt !== createdAt && (
                <div>최근 수정: {
                  Array.isArray(updatedAt)
                    ? `${updatedAt[0]}-${String(updatedAt[1]).padStart(2, '0')}-${String(updatedAt[2]).padStart(2, '0')} ${String(updatedAt[3] || 0).padStart(2, '0')}:${String(updatedAt[4] || 0).padStart(2, '0')}`
                    : new Date(updatedAt).toLocaleString('ko-KR')
                }</div>
              )}
            </div>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small">신청 기준 주차 (월요일)</Form.Label>
              <Form.Control
                type="date"
                value={reqDate}
                className="custom-input fw-bold text-muted"
                style={{ cursor: 'not-allowed' }}
                readOnly
              />
              <Form.Text className="text-muted small">신청 기준 주차는 변경할 수 없습니다.</Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small d-block mb-2">신청 요일 선택</Form.Label>
              <div 
                className="d-flex gap-2 pb-2 overflow-x-auto flex-nowrap user-select-none"
                style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {Object.keys(days).map(day => (
                  <Button
                    key={day}
                    variant={days[day] ? 'primary' : 'outline-secondary'}
                    className="rounded-circle fw-bold shadow-xs d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ 
                      width: '48px', 
                      height: '48px', 
                      fontSize: '0.95rem', 
                      padding: 0,
                      backgroundColor: days[day] ? 'var(--color-primary)' : 'var(--color-surface)',
                      borderColor: days[day] ? 'var(--color-primary)' : 'var(--color-input-border)',
                      color: days[day] ? '#ffffff' : (day === 'Sun' ? 'var(--color-danger)' : day === 'Sat' ? 'var(--color-info)' : 'var(--color-text-main)'),
                      transform: days[day] ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleDayToggle(day)}
                  >
                    {dayLabels[day]}
                  </Button>
                ))}
              </div>
              <div className="d-flex gap-2 mt-2 flex-wrap">
                <Button variant="outline-secondary" size="sm" onClick={handleSelectAll} className="rounded-pill fw-bold px-3">전체 선택</Button>
                <Button variant="outline-secondary" size="sm" onClick={handleWeekdaysOnly} className="rounded-pill fw-bold px-3">평일만 (월~금)</Button>
                <Button variant="outline-secondary" size="sm" onClick={handleWeekendsOnly} className="rounded-pill fw-bold px-3">주말만 (토/일)</Button>
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

export default RequestEdit;
