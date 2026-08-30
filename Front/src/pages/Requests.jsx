import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Badge, Modal, Table } from 'react-bootstrap';
import { format, startOfWeek, addDays, subMonths } from 'date-fns';
import { RiCalendarTodoLine, RiFileList3Line, RiCheckboxCircleLine, RiEyeLine, RiTimeLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { getMonthlyWorkApplyWorks, createWorkRequest } from '../api/workApi';
import './Main.css';


const DAY_CONFIG = [
  { key: 'wawIsMon', name: '월', offset: 0, timeKey: 'wawMonStartTime', wpNameKey: 'wawMonWorkPlaceName', isSun: false, isSat: false },
  { key: 'wawIsTue', name: '화', offset: 1, timeKey: 'wawTueStartTime', wpNameKey: 'wawTueWorkPlaceName', isSun: false, isSat: false },
  { key: 'wawIsWed', name: '수', offset: 2, timeKey: 'wawWedStartTime', wpNameKey: 'wawWedWorkPlaceName', isSun: false, isSat: false },
  { key: 'wawIsThu', name: '목', offset: 3, timeKey: 'wawThuStartTime', wpNameKey: 'wawThuWorkPlaceName', isSun: false, isSat: false },
  { key: 'wawIsFri', name: '금', offset: 4, timeKey: 'wawFriStartTime', wpNameKey: 'wawFriWorkPlaceName', isSun: false, isSat: false },
  { key: 'wawIsSat', name: '토', offset: 5, timeKey: 'wawSatStartTime', wpNameKey: 'wawSatWorkPlaceName', isSun: false, isSat: true },
  { key: 'wawIsSun', name: '일', offset: 6, timeKey: 'wawSunStartTime', wpNameKey: 'wawSunWorkPlaceName', isSun: true, isSat: false },
];

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
  const [viewingRequest, setViewingRequest] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const loadRequests = async (monthStr) => {
    const [year, month] = monthStr.split('-');
    const res = await getMonthlyWorkApplyWorks(parseInt(year, 10), parseInt(month, 10));
    if (res.success) {
      setRequestList(res.data || []);
    }
  };

  useEffect(() => {
    loadRequests(selectedMonth);
  }, [selectedMonth]);

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
      loadRequests(selectedMonth);
    } else {
      alert(res.error || '근무 신청에 실패했습니다.');
    }
  };

  const dayLabels = { Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토', Sun: '일' };

  const formatDateTime = (dt) => {
    if (!dt) return '-';
    if (Array.isArray(dt)) {
      return `${dt[0]}-${String(dt[1]).padStart(2, '0')}-${String(dt[2]).padStart(2, '0')} ${String(dt[3] || 0).padStart(2, '0')}:${String(dt[4] || 0).padStart(2, '0')}`;
    }
    return new Date(dt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Container className="py-4 py-md-5 mb-5">
      <div className="mb-4">
        <h2 className="fw-bold text-dark mb-1">근무 신청</h2>
        <p className="text-muted small mb-0">희망하는 근무 요일을 선택하여 신청서를 제출합니다.</p>
      </div>

      <Card className="border-0 shadow-sm rounded-4 mb-5">
        <Card.Body className="p-4 p-md-5">
          <div className="d-flex align-items-center gap-2 mb-4 fw-bold fs-5" style={{ color: '#A85A47' }}>
            <RiCalendarTodoLine size={22} /> 신규 근무 신청서
          </div>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small">신청 기준일 (월요일)</Form.Label>
              <Form.Control
                type="date"
                value={reqDate}
                className="custom-input fw-bold text-muted"
                style={{ cursor: 'not-allowed' }}
                readOnly
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small d-block mb-2">신청 요일 선택 (한 줄로 터치/드래그하여 선택)</Form.Label>
              <div
                className="d-flex gap-2 pb-2 overflow-x-auto flex-nowrap user-select-none"
                style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {Object.keys(days).map(day => (
                  <Button
                    key={day}
                    className={`rounded-circle fw-bold d-flex align-items-center justify-content-center flex-shrink-0 ${days[day] ? 'day-btn-on' : 'day-btn-off'}`}
                    style={{
                      width: '48px',
                      height: '48px',
                      fontSize: '0.95rem',
                      padding: 0,
                      color: days[day] ? '#ffffff' : (day === 'Sun' ? '#C94C48' : day === 'Sat' ? '#2B6CB0' : 'var(--color-text-main)'),
                    }}
                    onClick={() => handleDayToggle(day)}
                  >
                    {dayLabels[day]}
                  </Button>
                ))}
              </div>
              <div className="d-flex gap-2 mt-2 flex-wrap">
                <Button size="sm" onClick={handleSelectAll} className="rounded-pill fw-bold px-3 req-outline-btn">전체 선택</Button>
                <Button size="sm" onClick={handleWeekdaysOnly} className="rounded-pill fw-bold px-3 req-outline-btn">평일만 (월~금)</Button>
                <Button size="sm" onClick={handleWeekendsOnly} className="rounded-pill fw-bold px-3 req-outline-btn">주말만 (토/일)</Button>
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small">비고 (선택)</Form.Label>
              <Form.Control
                type="text"
                placeholder="추가 요청사항이 있다면 입력하세요"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="custom-input"
              />
            </Form.Group>

            <Button disabled={loading} type="submit" className="w-100 py-3 rounded-3 fw-bold fs-6"
              style={{ backgroundColor: '#A85A47', borderColor: '#A85A47', color: '#fff' }}>
              {loading ? '신청 중...' : '근무 신청서 제출하기'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2 text-dark fw-bold fs-5">
          <RiFileList3Line className="text-primary" /> 내 신청 내역
        </div>
        <Form.Select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="custom-month-select fw-bold"
          style={{ width: 'auto', minWidth: '140px', borderColor: '#C8957A', color: '#A85A47' }}
        >
          {[...Array(12)].map((_, i) => {
            // 과거 6개월 ~ 미래 5개월 정도 보여주기 (신청은 미래도 중요하므로)
            const d = addDays(subMonths(new Date(), 6), 0); // 일단 현재 달력 기준으로 앞뒤로 배치
            const baseMonthDate = addDays(new Date(), 0);
            const optDate = addDays(subMonths(baseMonthDate, 6 - i), 0);
            const val = format(optDate, 'yyyy-MM');
            return <option key={val} value={val}>{format(optDate, 'yyyy년 M월')}</option>;
          })}
        </Form.Select>
      </div>

      <div className="d-flex flex-column gap-3">
        {requestList.length === 0 ? (
          <div className="text-center py-5 rounded-4 border" style={{ color: 'var(--color-text-muted)' }}>
            <RiFileList3Line size={40} className="mb-2" style={{ opacity: 0.4, color: '#A85A47' }} />
            <p className="mb-0">신청 내역이 없습니다.</p>
          </div>
        ) : (
          requestList.map(req => {
            const hasAnyAssignedDay = DAY_CONFIG.some(d => ['배정', '타지점근무'].includes(req[d.key]));

            return (
              <Card key={req.wawIdx} className="border-0 shadow-sm rounded-4">
                <Card.Body className="p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div style={{ flex: '1 1 300px' }}>
                    <div className="fw-bold fs-5 mb-1" style={{ color: '#A85A47' }}>신청 주차: {req.wawDate} (월)</div>
                    <div className="text-muted small mb-2">
                      <div>신청일시: {formatDateTime(req.wawCreatedAt)}</div>
                      {req.wawUpdatedAt && req.wawUpdatedAt !== req.wawCreatedAt && (
                        <div>수정일시: {formatDateTime(req.wawUpdatedAt)}</div>
                      )}
                    </div>
                    {req.wawRemarks && (
                      <div className="small mb-2 p-2 rounded-3" style={{ background: '#F5EFE6', color: '#8D6E63' }}>비고: {req.wawRemarks}</div>
                    )}
                    <div className="d-flex gap-1 flex-wrap align-items-center mt-2">
                      {!hasAnyAssignedDay ? (
                        <span className="small" style={{ color: '#A89F97' }}>배정된 요일 없음</span>
                      ) : (
                        DAY_CONFIG.map(d => {
                          const status = req[d.key];
                          if (status !== '배정' && status !== '타지점근무') return null;
                          const bgColor = d.isSun ? 'rgb(255 209 209 / 0)' : d.isSat ? 'rgb(200 228 255 / 0)' : 'rgb(237 228 216 / 0)';
                          const textColor = d.isSun ? '#C94C48' : d.isSat ? '#2B6CB0' : '#937f79';
                          return (
                            <span
                              key={d.key}
                              className="px-2 py-1 rounded-pill fw-bold"
                              style={{ fontSize: '0.82rem', background: bgColor, color: textColor }}
                              title={`${d.name}요일: ${status}${req[d.timeKey] ? ` (${String(req[d.timeKey]).substring(0, 5)} 출근)` : ''}`}
                            >
                              {d.name}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-auto">
                    <Button
                      size="sm"
                      className="rounded-pill fw-bold px-3 d-flex align-items-center gap-1"
                      style={{ height: '36px', background: 'transparent', border: '1.5px solid #C8957A', color: '#A85A47' }}
                      onClick={() => setViewingRequest(req)}
                      title="요일별 배정 상태 및 출근 시간 상세 보기"
                    >
                      <RiEyeLine size={16} /> 보기
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-pill fw-bold px-3 d-flex align-items-center gap-1"
                      style={{ height: '36px', background: 'transparent', border: '1.5px solid #EDE4D8', color: '#8D6E63' }}
                      onClick={() => navigate(`/requests/edit/${req.wawIdx}`)}
                    >
                      수정하기
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            );
          })
        )}
      </div>

      {/* 주간 근무 상세 보기 모달 */}
      <Modal
        show={!!viewingRequest}
        onHide={() => setViewingRequest(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold fs-5 d-flex align-items-center gap-2">
            <RiCalendarTodoLine className="text-primary" />
            <span>
              {viewingRequest ? `${viewingRequest.wawDate} 주차 근무 배정 상세` : ''}
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {viewingRequest && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div className="text-muted small">
                  <div>신청일시: {formatDateTime(viewingRequest.wawCreatedAt)}</div>
                  {viewingRequest.wawUpdatedAt && viewingRequest.wawUpdatedAt !== viewingRequest.wawCreatedAt && (
                    <div>수정일시: {formatDateTime(viewingRequest.wawUpdatedAt)}</div>
                  )}
                </div>
                {viewingRequest.workPlaceName && (
                  <Badge bg="primary" className="px-2.5 py-1.5 rounded-pill">
                    소속: {viewingRequest.workPlaceName}
                  </Badge>
                )}
              </div>

              <div className="table-responsive rounded-3 border mb-3">
                <Table className="mb-0 text-center align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="py-2.5" style={{ width: '22%' }}>요일 / 날짜</th>
                      <th className="py-2.5" style={{ width: '22%' }}>배정 상태</th>
                      <th className="py-2.5" style={{ width: '30%' }}>출근 시간</th>
                      <th className="py-2.5" style={{ width: '26%' }}>근무 지점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAY_CONFIG.map(d => {
                      const status = viewingRequest[d.key] || '미신청';
                      const time = viewingRequest[d.timeKey] ? String(viewingRequest[d.timeKey]).substring(0, 5) : null;
                      const wpName = viewingRequest[d.wpNameKey] || viewingRequest.workPlaceName || '노란돼지';

                      let dayDateStr = '';
                      try {
                        const baseMon = new Date(viewingRequest.wawDate);
                        dayDateStr = format(addDays(baseMon, d.offset), 'MM/dd');
                      } catch (e) {
                        dayDateStr = '';
                      }

                      let statusBadge = <Badge bg="secondary" className="px-2 py-1">미신청</Badge>;
                      if (status === '배정') {
                        statusBadge = <Badge bg="success" className="px-2.5 py-1">배정</Badge>;
                      } else if (status === '신청') {
                        statusBadge = <Badge bg="warning" className="text-dark px-2.5 py-1">신청 (희망)</Badge>;
                      } else if (status === '타지점근무') {
                        statusBadge = <Badge bg="info" className="px-2.5 py-1">타지점근무</Badge>;
                      } else if (status === '미배정') {
                        statusBadge = <Badge bg="danger" className="px-2.5 py-1">미배정</Badge>;
                      }

                      return (
                        <tr key={d.key} className={status === '미신청' ? 'bg-light opacity-60' : ''}>
                          <td className="py-2.5 fw-bold">
                            <span className={d.isSun ? 'text-danger' : d.isSat ? 'text-primary' : 'text-dark'}>
                              {dayDateStr ? `${dayDateStr} (${d.name})` : `${d.name}요일`}
                            </span>
                          </td>
                          <td>{statusBadge}</td>
                          <td>
                            {time ? (
                              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary px-2.5 py-1.5 rounded-pill fw-bold">
                                <RiTimeLine className="me-1" />{time} 출근
                              </span>
                            ) : status === '신청' ? (
                              <span className="text-muted small">관리자 배정 대기</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {status === '배정' || status === '타지점근무' ? (
                              <span className="fw-bold text-dark small">{wpName}</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {viewingRequest.wawRemarks && (
                <div className="p-3 bg-light rounded-3 text-muted small">
                  <strong>비고 사항:</strong> {viewingRequest.wawRemarks}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" className="rounded-pill px-4" onClick={() => setViewingRequest(null)}>
            닫기
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Requests;
