import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Badge, Form, Row, Col, Button, Modal } from 'react-bootstrap';
import { format, subMonths } from 'date-fns';
import { RiTimeLine, RiCalendarCheckLine, RiAddLine, RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { getMonthlyWorkRecords, createWorkRecord } from '../api/workApi';
import Loading from '../components/Loading';
import PaginationBar from '../components/PaginationBar';
import './Main.css';

const Records = () => {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [records, setRecords] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(5);
  const [pageInput, setPageInput] = useState("1");
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  // 폼 상태
  const [recDate, setRecDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startHour, setStartHour] = useState('18');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('22');
  const [endMin, setEndMin] = useState('00');
  const [restHour, setRestHour] = useState('00');
  const [restMin, setRestMin] = useState('00');
  const [remarks, setRemarks] = useState('');

  const loadRecords = async (monthStr) => {
    setDataLoading(true);
    const [year, month] = monthStr.split('-');
    try {
      const res = await getMonthlyWorkRecords(parseInt(year, 10), parseInt(month, 10));
      if (res.success) {
        setRecords(res.data.content || res.data || []);
      }
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadRecords(selectedMonth);
  }, [selectedMonth]);

  const filteredRecords = useMemo(() => {
    return records; // 백엔드에서 필터링해서 가져오므로 클라이언트 필터 불필요
  }, [records]);

  useEffect(() => {
    setCurrentPage(0);
    setPageInput("1");
    setExpandedRecordId(null);
  }, [selectedMonth]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const pagedRecords = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

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
    if (!startRaw || !endRaw) return 0;
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
      loadRecords(selectedMonth);
    } else {
      alert(res.error || '근무 기록 추가에 실패했습니다.');
    }
  };

  return (
    <Container className="py-4 py-md-5 mb-5">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">근무 기록</h2>
          <p className="text-muted small mb-0">월별 근무 내역을 확인하고 수정할 수 있습니다.</p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Form.Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="custom-month-select fw-bold"
            style={{ width: 'auto', minWidth: '140px' }}
          >
            {[...Array(12)].map((_, i) => {
              const d = subMonths(new Date(), i);
              const val = format(d, 'yyyy-MM');
              return <option key={val} value={val}>{format(d, 'yyyy년 M월')}</option>;
            })}
          </Form.Select>
          <Button
            className="rounded-pill px-3 py-2 fw-bold text-nowrap d-inline-flex align-items-center gap-1 border-0"
            onClick={() => setShowModal(true)}
            style={{ whiteSpace: 'nowrap', backgroundColor: 'var(--color-primary)', color: '#fff' }}
          >
            <RiAddLine size={18} /> 새 기록 추가
          </Button>
        </div>
      </div>

      {dataLoading ? <Loading /> : <>
      <Row className="g-3 mb-4">
        <Col xs={6}>
          <Card className="border-0 shadow-sm rounded-4 text-center p-3 h-100" style={{ backgroundColor: 'var(--color-surface)' }}>
            <h6 className="text-muted fw-bold small mb-2">이번 달 근무일</h6>
            <h3 className="fw-bold mb-0" style={{ color: 'var(--color-primary)' }}>{filteredRecords.length}<span className="fs-6 text-muted ms-1">일</span></h3>
          </Card>
        </Col>
        <Col xs={6}>
          <Card className="border-0 shadow-sm rounded-4 text-center p-3 h-100" style={{ backgroundColor: 'var(--color-surface)' }}>
            <h6 className="text-muted fw-bold small mb-2">누적 근무시간</h6>
            <h3 className="fw-bold mb-0" style={{ color: 'var(--color-primary)' }}>
              {filteredRecords.reduce((acc, r) => acc + calculateTotalHours(r.wrStartTime, r.wrEndTime, r.wrRestTime), 0).toFixed(1)}
              <span className="fs-6 text-muted ms-1">시간</span>
            </h3>
          </Card>
        </Col>
      </Row>

      <div className="d-flex flex-column gap-3">
        {filteredRecords.length === 0 ? (
          <div className="text-center text-muted py-5 rounded-4 border" style={{ borderColor: 'var(--color-input-border)', backgroundColor: 'var(--color-surface)' }}>
            <RiCalendarCheckLine size={44} className="mb-2" style={{ opacity: 0.4, color: 'var(--color-primary)' }} />
            <p className="mb-0 fw-medium">해당 월의 근무 기록이 없습니다.</p>
          </div>
        ) : (
          <>
            {pagedRecords.map(record => {
              const st = parseLocalTime(record.wrStartTime);
              const et = parseLocalTime(record.wrEndTime);
              const sh = String(st.hour).padStart(2, '0');
              const sm = String(st.minute).padStart(2, '0');
              const eh = String(et.hour).padStart(2, '0');
              const em = String(et.minute).padStart(2, '0');
              const rt = record.wrRestTime ? parseLocalTime(record.wrRestTime) : null;
              const totalHours = calculateTotalHours(record.wrStartTime, record.wrEndTime, record.wrRestTime).toFixed(1);
              const isExpanded = expandedRecordId === record.wrIdx;

              return (
                <Card 
                  key={record.wrIdx} 
                  className={`border-0 shadow-sm rounded-4 mb-2 ${isExpanded ? 'mb-4' : ''}`}
                  style={{ 
                    transition: 'all 0.3s ease', 
                    cursor: 'pointer',
                    backgroundColor: 'var(--color-surface)',
                    borderLeft: isExpanded ? '4px solid var(--color-primary)' : '4px solid transparent'
                  }}
                  onClick={() => setExpandedRecordId(isExpanded ? null : record.wrIdx)}
                >
                  <Card.Body className={isExpanded ? "p-4" : "p-3"}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="fw-bolder mb-1 text-dark" style={{ letterSpacing: '-0.5px' }}>
                          {(() => {
                            const d = new Date(record.wrDate);
                            if (isNaN(d)) return record.wrDate;
                            const days = ['일', '월', '화', '수', '목', '금', '토'];
                            return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
                          })()}
                        </h5>
                        <span className="text-muted small fw-medium d-flex align-items-center gap-1">
                          <RiTimeLine /> {sh}:{sm} - {eh}:{em}
                        </span>
                      </div>
                      <div className="text-end d-flex align-items-center gap-3">
                        <div>
                          <h3 className="fw-black mb-0" style={{ color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>
                            {totalHours}<span className="fs-6 text-muted ms-1 fw-medium" style={{ letterSpacing: '0' }}>시간</span>
                          </h3>
                          {!isExpanded && record.wrRemarks && (
                            <span className="badge mt-1" style={{ backgroundColor: 'var(--color-text-light)', color: 'var(--color-surface)', fontSize: '0.65rem' }}>비고 있음</span>
                          )}
                        </div>
                        <div className="text-muted" style={{ transition: 'transform 0.3s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                          <RiArrowDownSLine size={24} />
                        </div>
                      </div>
                    </div>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-top" style={{ borderColor: 'var(--color-input-border)' }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex flex-column gap-2">
                          {rt && (rt.hour > 0 || rt.minute > 0) && (
                            <div className="d-flex justify-content-between align-items-center p-2 px-3 rounded-3" style={{ backgroundColor: 'var(--color-input-bg)' }}>
                              <span className="text-muted small fw-bold">휴게시간</span>
                              <span className="text-dark small fw-medium">{rt.hour}시간 {rt.minute > 0 ? `${rt.minute}분` : ''}</span>
                            </div>
                          )}
                          
                          {record.wrRemarks && (
                            <div className="p-3 rounded-3" style={{ backgroundColor: 'var(--color-surface-hover)', border: '1px dashed var(--color-input-border)' }}>
                              <span className="badge mb-2" style={{ backgroundColor: 'var(--color-text-light)', color: 'var(--color-surface)' }}>비고</span>
                              <div className="text-dark small fw-medium">{record.wrRemarks}</div>
                            </div>
                          )}

                          <div className="d-flex justify-content-end mt-2">
                            <Button 
                              variant="light" 
                              className="rounded-pill fw-bold px-4 py-2 shadow-sm border"
                              onClick={(e) => { e.stopPropagation(); navigate(`/records/edit/${record.wrIdx}`); }}
                              style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', borderColor: 'var(--color-input-border)', backgroundColor: 'var(--color-input-bg)' }}
                            >
                              기록 수정하기
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              );
            })}
            
            {totalPages > 0 && (
              <div className="mt-4">
                <PaginationBar 
                  page={currentPage} 
                  totalPages={totalPages} 
                  setPage={setCurrentPage}
                  pageInput={pageInput}
                  setPageInput={setPageInput}
                />
              </div>
            )}
          </>
        )}
      </div>

      </>}

      {/* 새 기록 추가 모달 */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold text-dark">새 근무 기록 추가</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleAddRecord}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">근무 날짜</Form.Label>
              <Form.Control type="date" value={recDate} onChange={e => setRecDate(e.target.value)} required className="custom-input" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">출근 시간</Form.Label>
              <div className="d-flex gap-2 align-items-center">
                <Form.Select value={startHour} onChange={e => setStartHour(e.target.value)} className="custom-input flex-grow-1">
                  {[...Array(24)].map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}시</option>)}
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
              <Form.Label className="fw-bold text-muted small">종료 시간</Form.Label>
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
              <Form.Label className="fw-bold text-muted small">비고</Form.Label>
              <Form.Control type="text" placeholder="특이사항 입력" value={remarks} onChange={e => setRemarks(e.target.value)} className="custom-input" />
            </Form.Group>

            <Button disabled={loading} variant="primary" type="submit" className="w-100 py-3 fw-bold rounded-3">
              {loading ? '저장 중...' : '기록 저장'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

    </Container>
  );
};

export default Records;
