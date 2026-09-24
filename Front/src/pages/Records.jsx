import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Badge, Form, Row, Col, Button, Modal } from 'react-bootstrap';
import { format, subMonths, isBefore, isSameDay, startOfDay, parseISO, isWeekend } from 'date-fns';
import { RiTimeLine, RiCalendarCheckLine, RiAddLine, RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { isHoliday } from 'korean-holidays';
import useAuthStore from '../store/useAuthStore';
import { getMonthlyWorkRecords, createWorkRecord, getMonthlyWorkApplyWorks } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
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
  const [branches, setBranches] = useState([]);
  const [workPlaceIdx, setWorkPlaceIdx] = useState(String(user?.workPlaceIdx || ''));

  const parseDateStr = (dateObj) => {
    if (!dateObj) return new Date();
    if (typeof dateObj === 'string') {
      const parts = dateObj.split('T')[0].split('-');
      if (parts.length === 3) return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return parseISO(dateObj);
    }
    if (Array.isArray(dateObj)) {
      const [y, m, d] = dateObj;
      return new Date(y, m - 1, d);
    }
    return new Date(dateObj);
  };

  const loadRecords = async (monthStr) => {
    setDataLoading(true);
    const [year, month] = monthStr.split('-');
    try {
      const [recordsRes, requestsRes] = await Promise.all([
        getMonthlyWorkRecords(parseInt(year, 10), parseInt(month, 10)),
        getMonthlyWorkApplyWorks(parseInt(year, 10), parseInt(month, 10))
      ]);
      
      let workRecs = [];
      if (recordsRes.success) {
        workRecs = recordsRes.data.content || recordsRes.data || [];
      }

      let reqList = [];
      if (requestsRes.success) {
        reqList = requestsRes.data.content || (Array.isArray(requestsRes.data) ? requestsRes.data : []);
      }

      const today = startOfDay(new Date());
      const missingList = [];

      reqList.forEach(req => {
        if ((req.wsdStatus === '출근' || req.wsdStatus === '배정' || req.wsdStatus === '타지점근무') && req.wsdIsConfirmed === true) {
          const reqDate = parseDateStr(req.date || req.wsdDate);
          if (isBefore(reqDate, today) || isSameDay(reqDate, today)) {
            // Check if record exists
            const hasRecord = workRecs.some(wr => {
              const wrD = parseDateStr(wr.wrDate);
              return isSameDay(wrD, reqDate);
            });
            if (!hasRecord) {
              missingList.push({
                isMissing: true,
                wrDate: req.date || req.wsdDate,
                workPlaceName: req.wsdWorkPlaceName,
                assignedStartTime: req.wsdStartTime,
                wrIdx: `missing_${req.wsdIdx || Math.random()}`,
                rawRequest: req
              });
            }
          }
        }
      });

      // Merge and sort descending
      const merged = [...workRecs, ...missingList].sort((a, b) => {
        const dA = parseDateStr(a.wrDate);
        const dB = parseDateStr(b.wrDate);
        return dB - dA; // Descending
      });

      setRecords(merged);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadRecords(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    fetchWorkPlaces().then(res => {
      if (res.success && res.data) setBranches(res.data);
    });
  }, []);

  useEffect(() => {
    if (user?.workPlaceIdx) setWorkPlaceIdx(String(user.workPlaceIdx));
  }, [user?.workPlaceIdx]);

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

  const handleOpenMissingRecord = (record) => {
    const d = parseDateStr(record.wrDate);
    setRecDate(format(d, 'yyyy-MM-dd'));

    // 근무지 매핑
    if (record.workPlaceName) {
      const matched = branches.find(b => b.wpName === record.workPlaceName);
      if (matched) setWorkPlaceIdx(String(matched.wpIdx));
    }

    // 출근/퇴근 시간 계산
    let sHour = 18;
    let sMin = 0;
    
    if (record.assignedStartTime === '오픈') {
      const isWknd = isWeekend(d);
      const isHol = isHoliday(d);
      if (isWknd || isHol) {
        sHour = 10;
      } else {
        sHour = 16;
      }
    } else if (record.assignedStartTime) {
      const parts = record.assignedStartTime.split(':');
      sHour = parseInt(parts[0], 10) || 18;
      sMin = parseInt(parts[1], 10) || 0;
    }

    const eHour = (sHour + 4) % 24;

    setStartHour(String(sHour).padStart(2, '0'));
    setStartMin(String(sMin).padStart(2, '0'));
    setEndHour(String(eHour).padStart(2, '0'));
    setEndMin(String(sMin).padStart(2, '0'));
    
    setRestHour('00');
    setRestMin('00');
    setRemarks('');
    
    setShowModal(true);
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

    if (!user?.userIdx) {
      alert('로그인 정보가 없습니다. 다시 로그인해 주세요.');
      setLoading(false);
      return;
    }

    const recordData = {
      wrDate: recDate,
      wrStartTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
      wrEndTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
      wrRestTime: `${String(restHour).padStart(2, '0')}:${String(restMin).padStart(2, '0')}`,
      wrRemarks: remarks,
      userIdx: user.userIdx,
      workPlaceIdx: workPlaceIdx || user?.workPlaceIdx
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

              const hasRest = rt && (rt.hour > 0 || rt.minute > 0);
              const restLabel = hasRest
                ? `휴게 ${rt.hour}시간${rt.minute > 0 ? ` ${rt.minute}분` : ''}`
                : null;

              return (
                <Card 
                  key={record.wrIdx} 
                  className="border-0 shadow-sm rounded-4 mb-2"
                  style={{ 
                    transition: 'border-color 0.2s ease', 
                    cursor: 'pointer',
                    backgroundColor: 'var(--color-surface)',
                    borderLeft: isExpanded ? '4px solid var(--color-primary)' : '4px solid transparent'
                  }}
                  onClick={() => setExpandedRecordId(isExpanded ? null : record.wrIdx)}
                >
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="min-w-0 pe-2">
                        <h5 className="fw-bolder mb-1" style={{ letterSpacing: '-0.5px', color: 'var(--color-text-main)' }}>
                          {(() => {
                            const d = new Date(record.wrDate);
                            if (isNaN(d)) return record.wrDate;
                            const days = ['일', '월', '화', '수', '목', '금', '토'];
                            return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
                          })()}
                        </h5>
                        <span className="text-muted small fw-medium d-flex align-items-center gap-1 flex-wrap">
                          {record.isMissing ? (
                            <span className="text-danger fw-bold"><RiTimeLine /> 미기재 ({record.assignedStartTime?.substring(0, 5)})</span>
                          ) : (
                            <>
                              <span className="d-inline-flex align-items-center gap-1">
                                <RiTimeLine /> {sh}:{sm} - {eh}:{em}
                              </span>
                              {restLabel && (
                                <span className="text-muted">· {restLabel}</span>
                              )}
                            </>
                          )}
                        </span>
                        {!record.isMissing && record.wrRemarks && (
                          <span
                            className="badge mt-1"
                            style={{ backgroundColor: 'var(--color-text-light)', color: 'var(--color-surface)', fontSize: '0.65rem' }}
                          >
                            비고 있음
                          </span>
                        )}
                      </div>
                      <div className="text-end d-flex align-items-center gap-3 flex-shrink-0">
                        <div>
                          {record.isMissing ? (
                            <Badge bg="danger" className="py-2 px-3 fw-bold" style={{ fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}>미기재</Badge>
                          ) : (
                            <h3 className="fw-black mb-0" style={{ color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>
                              {totalHours}<span className="fs-6 text-muted ms-1 fw-medium" style={{ letterSpacing: '0' }}>시간</span>
                            </h3>
                          )}
                        </div>
                        <div className="text-muted" style={{ transition: 'transform 0.3s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                          <RiArrowDownSLine size={24} />
                        </div>
                      </div>
                    </div>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-top" style={{ borderColor: 'var(--color-border)' }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex flex-column gap-2">
                          {record.isMissing ? (
                            <div className="text-center p-3">
                              <p className="text-muted mb-3 small fw-medium">이 날짜에 배정되었으나 근무 기록이 없습니다.</p>
                              <Button 
                                variant="primary" 
                                className="fw-bold px-4 py-2 border-0 d-flex align-items-center justify-content-center gap-2 mx-auto"
                                onClick={(e) => { e.stopPropagation(); handleOpenMissingRecord(record); }}
                              >
                                <RiAddLine size={18} /> 기록 추가하기
                              </Button>
                            </div>
                          ) : (
                            <>
                              {record.wrRemarks && (
                                <div className="p-3 rounded-3" style={{ backgroundColor: 'var(--color-surface-hover)', border: '1px dashed var(--color-border)' }}>
                                  <span className="badge mb-2" style={{ backgroundColor: 'var(--color-text-light)', color: 'var(--color-surface)' }}>비고</span>
                                  <div className="small fw-medium" style={{ color: 'var(--color-text-main)' }}>{record.wrRemarks}</div>
                                </div>
                              )}

                              <div className="d-flex justify-content-end mt-2">
                                <Button 
                                  variant="light" 
                                  className="fw-bold px-4 py-2 border"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const until = record.editableUntil || record.wrEditableUntil;
                                    const editable = record.isEditable !== false && record.isEditable !== 0;
                                    // 기한이 지난 기록만 경고 (예: 7·8월). 아직 기한 전(예: 9월 → 10/1 23:59)이면 안내 없이 수정 화면으로.
                                    if (!editable) {
                                      const untilLabel = until
                                        ? format(typeof until === 'string' ? parseISO(until.split('T')[0]) : parseISO(String(until).slice(0, 10)), 'yyyy년 MM월 dd일')
                                        : null;
                                      const msg = untilLabel
                                        ? `수정 기한은 ${untilLabel} 23:59까지입니다. 이후에는 급여 담당자에게 직접 연락하세요.`
                                        : '수정 기한이 지났습니다. 급여 담당자에게 직접 연락하세요.';
                                      alert(msg);
                                      return;
                                    }
                                    navigate('/records/edit', { state: { id: record.wrIdx } });
                                  }}
                                  style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', borderColor: 'var(--color-border)', backgroundColor: 'var(--color-input-bg)' }}
                                >
                                  기록 수정하기
                                </Button>
                              </div>
                            </>
                          )}
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
              <Form.Label className="fw-bold text-muted small">근무지</Form.Label>
              <Form.Select value={workPlaceIdx} onChange={e => setWorkPlaceIdx(e.target.value)} className="custom-input">
                {branches.map(b => (
                  <option key={b.wpIdx} value={String(b.wpIdx)}>{b.wpName}{String(b.wpIdx) === String(user?.workPlaceIdx) ? ' (내 지점)' : ''}</option>
                ))}
              </Form.Select>
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
