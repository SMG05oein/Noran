import { useState, useEffect } from 'react';
import { Container, ButtonGroup, ToggleButton, Card, Table, Button, Spinner, Modal, Form, Badge } from 'react-bootstrap';
import { fetchWorkRecords, updateWorkRecord, downloadWorkRecordExcel, fetchWorkRecordHistory, createWorkRecord, deleteWorkRecord, restoreWorkRecord } from '../api/workApi';
import { fetchWorkPlaces, fetchAdminWorkers } from '../api/authApi';
import { format } from 'date-fns';
import { RiSearchLine, RiDownload2Line, RiHistoryLine, RiStore2Line, RiRefreshLine, RiArrowRightSLine } from 'react-icons/ri';
import PaginationBar from '../components/PaginationBar';
import Loading from '../components/Loading';
import './AdminMain.css';

const AdminRecords = () => {
  const [selectedWpIdx, setSelectedWpIdx] = useState(null); // null이면 전체
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [workRecords, setWorkRecords] = useState([]);
  const [branches, setBranches] = useState([{ wpIdx: null, wpName: '전체' }]);
  const [loading, setLoading] = useState(true);

  // Pagination & Sorting states
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // 수정 모달 상태
  const [editRecord, setEditRecord] = useState(null);
  const [startHour, setStartHour] = useState('');
  const [startMin, setStartMin] = useState('');
  const [endHour, setEndHour] = useState('');
  const [endMin, setEndMin] = useState('');
  const [restHour, setRestHour] = useState('');
  const [restMin, setRestMin] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // 수정 이력(Audit Log) 관련 상태
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySearchInput, setHistorySearchInput] = useState('');

  // 추가 모달 관련 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createWorkers, setCreateWorkers] = useState([]);
  const [createWorkerSearch, setCreateWorkerSearch] = useState('');
  const [createRecord, setCreateRecord] = useState({
    userIdx: '',
    wpIdx: '',
    wrDate: format(new Date(), 'yyyy-MM-dd'),
    startHour: '09', startMin: '00',
    endHour: '18', endMin: '00',
    restHour: '01', restMin: '00',
    remarks: ''
  });

  const loadBranches = async () => {
    const branchRes = await fetchWorkPlaces();
    if (branchRes.success && branchRes.data) {
      setBranches([{ wpIdx: null, wpName: '전체' }, ...branchRes.data]);
    }
  };

  const loadData = async (skipCache = false) => {
    setLoading(true);
    let year = null, month = null;
    if (selectedMonth) {
      const [yStr, mStr] = selectedMonth.split('-');
      year = parseInt(yStr, 10);
      month = parseInt(mStr, 10);
    }

    const params = {
      page,
      size: 10,
      sortBy,
      sortDir,
      userName: searchTerm || undefined,
      workPlaceIdx: selectedWpIdx || undefined,
      year: year || undefined,
      month: month || undefined
    };

    const recRes = await fetchWorkRecords(params, skipCache);
    if (recRes.success) {
      setWorkRecords(recRes.data.content || recRes.data || []);
      setTotalPages(recRes.data.totalPages || 1);
    }
    setLoading(false);
  };

  useEffect(() => { loadBranches(); }, []);
  useEffect(() => { 
    loadData(); 
    setPageInput((page + 1).toString());
  }, [page, sortBy, sortDir, searchTerm, selectedWpIdx, selectedMonth]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(0);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc'); // 기본 내림차순 시작
    }
    setPage(0);
  };

  const filteredRecords = workRecords; // 서버사이드 페이징 사용하므로 추가 필터링 제거

  const openEditModal = (r) => {
    setEditRecord(r);
    // Parse time arrays or strings
    const parseTime = (t) => {
      if (Array.isArray(t)) return [String(t[0]).padStart(2, '0'), String(t[1]).padStart(2, '0')];
      if (typeof t === 'string') return t.split(':').slice(0, 2);
      return ['00', '00'];
    };
    const [sh, sm] = parseTime(r.wrStartTime);
    const [eh, em] = parseTime(r.wrEndTime);
    const [rh, rm] = parseTime(r.wrRestTime);
    setStartHour(sh); setStartMin(sm);
    setEndHour(eh); setEndMin(em);
    setRestHour(rh); setRestMin(rm);
    setRemarks(r.wrRemarks || '');
  };

  const handleSaveEdit = async () => {
    if (!editRecord) return;
    setSaving(true);
    const payload = {
      ...editRecord,
      wrStartTime: `${startHour}:${startMin}`,
      wrEndTime: `${endHour}:${endMin}`,
      wrRestTime: `${restHour}:${restMin}`,
      wrRemarks: remarks
    };
    // format date if array
    if (Array.isArray(payload.wrDate)) {
      payload.wrDate = `${payload.wrDate[0]}-${String(payload.wrDate[1]).padStart(2, '0')}-${String(payload.wrDate[2]).padStart(2, '0')}`;
    }
    const res = await updateWorkRecord(editRecord.wrIdx, payload);
    setSaving(false);
    if (res.success) {
      alert('근무 기록이 수정되었습니다.');
      setEditRecord(null);
      loadData();
    } else {
      alert(res.error || '수정에 실패했습니다.');
    }
  };

  const handleDeleteRecord = async (wrIdx) => {
    if (!window.confirm('정말 이 근무 기록을 삭제하시겠습니까?')) return;
    const res = await deleteWorkRecord(wrIdx);
    if (res.success) {
      alert('근무 기록이 삭제되었습니다.');
      loadData();
    } else {
      alert(res.error || '삭제에 실패했습니다.');
    }
  };

  const openCreateModal = async () => {
    setShowCreateModal(true);
    // 직원 목록 불러오기
    const res = await fetchAdminWorkers();
    if (res.success) {
      setCreateWorkers(Array.isArray(res.data) ? res.data : (res.data.content || []));
    }
  };

  const handleCreateRecord = async () => {
    if (!createRecord.userIdx) return alert('직원을 선택해주세요.');
    if (!createRecord.wrDate) return alert('날짜를 선택해주세요.');

    setSaving(true);
    const payload = {
      userIdx: parseInt(createRecord.userIdx, 10),
      wrDate: createRecord.wrDate,
      wrStartTime: `${createRecord.startHour}:${createRecord.startMin}:00`,
      wrEndTime: `${createRecord.endHour}:${createRecord.endMin}:00`,
      wrRestTime: `${createRecord.restHour}:${createRecord.restMin}:00`,
      wrRemarks: createRecord.remarks
    };

    const res = await createWorkRecord(payload);
    setSaving(false);
    if (res.success) {
      alert('근무 기록이 추가되었습니다.');
      setShowCreateModal(false);
      setCreateRecord({
        ...createRecord,
        remarks: ''
      });
      loadData();
    } else {
      alert(res.error || '추가에 실패했습니다.');
    }
  };

  const openHistoryModal = async () => {
    setShowHistoryModal(true);
    setHistorySearchInput('');
    setHistorySearchTerm('');
    await loadHistoryData('');
  };

  const handleRestoreRecord = async (wrhIdx) => {
    if (!window.confirm('이 삭제된 기록을 복구하시겠습니까?')) return;
    setHistoryLoading(true);
    const res = await restoreWorkRecord(wrhIdx);
    if (res.success) {
      alert('근무 기록이 복구되었습니다.');
      // 메인 테이블 리로드
      loadData();
      // 이력 모달 데이터 리로드
      await loadHistoryData(historySearchTerm);
    } else {
      alert(res.error || '복구에 실패했습니다.');
    }
    setHistoryLoading(false);
  };

  const loadHistoryData = async (searchKw = '') => {
    setHistoryLoading(true);
    const params = {};
    if (searchKw) {
      params.keyword = searchKw;
    }
    
    // 현재 선택된 월(selectedMonth)을 기준으로 파라미터 추가
    if (selectedMonth) {
      const [yStr, mStr] = selectedMonth.split('-');
      params.year = parseInt(yStr, 10);
      params.month = parseInt(mStr, 10);
    }
    
    // 페이징 (백엔드 지원 여부에 따라)
    params.size = 100;

    const res = await fetchWorkRecordHistory(params);
    if (res.success) {
      let data = Array.isArray(res.data) ? res.data : (res.data.content || []);
      // 최신순(역정렬) 보장
      data = [...data].sort((a, b) => (b.wrhIdx || 0) - (a.wrhIdx || 0));
      setHistoryData(data);
    } else {
      alert(res.error || '수정 이력을 불러오지 못했습니다.');
    }
    setHistoryLoading(false);
  };

  const handleHistorySearch = (e) => {
    e.preventDefault();
    setHistorySearchTerm(historySearchInput);
    loadHistoryData(historySearchInput);
  };

  const filteredHistory = historyData.filter(log => {
    if (!historySearchTerm) return true;
    const term = historySearchTerm.toLowerCase();
    const workerName = (log.targetUserName || '').toLowerCase();
    const modifierName = (log.adminName || '').toLowerCase();
    return workerName.includes(term) || modifierName.includes(term);
  });

  const calcHoursStr = (startStr, endStr, restStr) => {
    if (!startStr || !endStr) return '';
    const parseLocal = (t) => {
      if (typeof t === 'string' && t.includes(':')) {
        const parts = t.split(':');
        return { hour: parseInt(parts[0], 10), minute: parseInt(parts[1], 10) };
      }
      return { hour: 0, minute: 0 };
    };
    const start = parseLocal(startStr);
    const end = parseLocal(endStr);
    const rest = restStr ? parseLocal(restStr) : { hour: 0, minute: 0 };
    
    const startNum = start.hour + (start.minute / 60);
    let endNum = end.hour + (end.minute / 60);
    if (endNum < startNum) endNum += 24;
    const restNum = rest.hour + (rest.minute / 60);
    
    const total = Math.max(0, endNum - startNum - restNum);
    return ` (총 ${total % 1 === 0 ? total : total.toFixed(1)}시간)`;
  };

  const formatHistoryTime = (log) => {
    const bStart = log.beforeStartTime ? log.beforeStartTime.substring(0,5) : '-';
    const bEnd = log.beforeEndTime ? log.beforeEndTime.substring(0,5) : '-';
    const bRest = log.beforeRestTime && log.beforeRestTime !== '00:00:00' ? ` (휴게 ${log.beforeRestTime.substring(0,5)})` : '';
    const bHours = calcHoursStr(log.beforeStartTime, log.beforeEndTime, log.beforeRestTime);
    
    const aStart = log.afterStartTime ? log.afterStartTime.substring(0,5) : '-';
    const aEnd = log.afterEndTime ? log.afterEndTime.substring(0,5) : '-';
    const aRest = log.afterRestTime && log.afterRestTime !== '00:00:00' ? ` (휴게 ${log.afterRestTime.substring(0,5)})` : '';
    const aHours = calcHoursStr(log.afterStartTime, log.afterEndTime, log.afterRestTime);
    
    return {
      oldVal: `${bStart} ~ ${bEnd}${bRest}${bHours}`,
      newVal: `${aStart} ~ ${aEnd}${aRest}${aHours}`
    };
  };

  const calculateTotalHours = (record) => {
    if(!record.wrStartTime || !record.wrEndTime) return 0;
    const parseLocalTime = (t) => {
      if (Array.isArray(t)) return { hour: t[0], minute: t[1] };
      if (typeof t === 'string') {
        const parts = t.split(':');
        return { hour: parseInt(parts[0], 10), minute: parseInt(parts[1], 10) };
      }
      return { hour: 0, minute: 0 };
    };
    const start = parseLocalTime(record.wrStartTime);
    const end = parseLocalTime(record.wrEndTime);
    const rest = record.wrRestTime ? parseLocalTime(record.wrRestTime) : { hour: 0, minute: 0 };
    
    const startNum = start.hour + (start.minute / 60);
    let endNum = end.hour + (end.minute / 60);
    if (endNum < startNum) endNum += 24;
    const restNum = rest.hour + (rest.minute / 60);
    
    return Math.max(0, endNum - startNum - restNum);
  };

  const formatTimeStr = (t) => {
    if (Array.isArray(t)) return `${String(t[0]).padStart(2, '0')}:${String(t[1]).padStart(2, '0')}`;
    if (typeof t === 'string' && t.length >= 5) return t.substring(0, 5);
    return '-';
  };

  const formatDateStr = (d) => {
    if (Array.isArray(d)) return `${d[0]}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}`;
    return d || '-';
  };

  const handleDownloadExcel = async () => {
    if (!selectedMonth) return;
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const workPlaceIdx = selectedWpIdx || null;

    setDownloading(true);
    const res = await downloadWorkRecordExcel(year, month, workPlaceIdx);
    setDownloading(false);
    if (!res.success) {
      alert(res.error || '엑셀 다운로드에 실패했습니다.');
    }
  };

  return (
    <div className="admin-container">
      <Container className="py-4 py-md-5">
        <div className="admin-header-card">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h2 className="fw-bold text-dark mb-1">근무 기록 관리</h2>
              <p className="text-muted small mb-0">전체 직원의 월별 출퇴근 기록을 조회, 검색, 수정하고 엑셀로 다운로드합니다.</p>
            </div>
            
            <div className="d-flex align-items-center gap-2">
              <Button 
                variant="primary" 
                className="fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 py-2 shadow-xs" 
                onClick={openCreateModal}
              >
                새 기록 추가
              </Button>
              <Button 
                variant="outline-info" 
                className="fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 py-2 shadow-xs" 
                onClick={openHistoryModal}
              >
                <RiHistoryLine size={16} /> 관리자 수정 이력
              </Button>
              <Button
                variant="outline-secondary" 
                className="fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 py-2 shadow-xs" 
                onClick={() => {
                  setPage(0);
                  setPageInput('1');
                  loadData(true);
                }}
                disabled={loading}
              >
                <RiRefreshLine size={16} />
                새로고침
              </Button>
              <Button 
                variant="success" 
                className="fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 py-2 shadow-xs" 
                onClick={handleDownloadExcel}
                disabled={downloading}
              >
                <RiDownload2Line size={16} />
                {downloading ? '다운로드 중...' : '엑셀 다운로드'}
              </Button>
            </div>
          </div>

          <hr className="my-3 opacity-25" />

          {/* 검색 및 필터 바 */}
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Form onSubmit={handleSearch} className="d-flex align-items-center gap-1 flex-grow-1" style={{ minWidth: '220px', maxWidth: '320px' }}>
              <Form.Control
                type="text"
                placeholder="직원 이름 검색"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="custom-input py-2"
              />
              <Button type="submit" variant="primary" className="fw-bold rounded-3 px-3 py-2 text-nowrap">
                <RiSearchLine size={16} />
              </Button>
            </Form>

            <Form.Control 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              className="custom-input py-2 fw-bold text-primary"
              style={{ width: '160px' }}
            />

            <div className="branch-select-pills mb-0 ms-md-auto">
              {branches.map((b) => (
                <button
                  key={b.wpIdx ?? 'all'}
                  type="button"
                  className={`branch-pill ${selectedWpIdx === b.wpIdx ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedWpIdx(b.wpIdx);
                    setPage(0);
                  }}
                >
                  <RiStore2Line className="me-1" />
                  {b.wpName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? <Loading /> : (
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Body className="p-0">
              {filteredRecords.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <RiHistoryLine size={36} className="opacity-50 mb-2" />
                  <p className="mb-0">해당 조건의 근무 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="custom-table align-middle mb-0 text-center">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>No.</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('date')}>
                          날짜 {sortBy === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('workPlace')}>
                          지점 {sortBy === 'workPlace' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('userName')}>
                          직원 {sortBy === 'userName' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th>출근</th>
                        <th>퇴근</th>
                        <th>휴게</th>
                        <th>총 근무</th>
                        <th>메모</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((r, idx) => {
                        const totalHours = calculateTotalHours(r);
                        return (
                          <tr key={r.wrIdx}>
                            <td className="text-muted fw-semibold">{page * 10 + idx + 1}</td>
                            <td className="fw-bold text-dark">{formatDateStr(r.wrDate)}</td>
                            <td><Badge bg="light" className="text-dark border">{r.workPlaceName || '-'}</Badge></td>
                            <td><span className="fw-bold text-primary">{r.userName || `사원(${r.userIdx})`}</span></td>
                            <td>{formatTimeStr(r.wrStartTime)}</td>
                            <td>{formatTimeStr(r.wrEndTime)}</td>
                            <td>{formatTimeStr(r.wrRestTime)}</td>
                            <td className="fw-bold text-success">{totalHours.toFixed(1)}시간</td>
                            <td className="small text-muted text-truncate" style={{ maxWidth: '140px' }}>{r.wrRemarks || '-'}</td>
                            <td>
                              <div className="d-flex align-items-center justify-content-center gap-2">
                                <Button size="sm" variant="outline-primary" className="rounded-pill fw-bold px-3" onClick={() => openEditModal(r)}>
                                  수정
                                </Button>
                                <Button size="sm" variant="outline-danger" className="rounded-pill fw-bold px-3" onClick={() => handleDeleteRecord(r.wrIdx)}>
                                  삭제
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
              <div className="p-3 border-top">
                <PaginationBar 
                  page={page} 
                  totalPages={totalPages} 
                  pageInput={pageInput} 
                  setPage={setPage} 
                  setPageInput={setPageInput} 
                />
              </div>
            </Card.Body>
          </Card>
        )}
      </Container>

      {/* 수정 모달 */}
      <Modal show={!!editRecord} onHide={() => setEditRecord(null)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold text-dark fs-5">근무 기록 수정</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {editRecord && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">직원 및 날짜</Form.Label>
                <div className="p-2 bg-light rounded-3">
                  <span className="fw-bold text-primary">{editRecord.userName}({editRecord.workPlaceName || '지점'})</span> / {formatDateStr(editRecord.wrDate)}
                </div>
              </Form.Group>
              <div className="d-flex gap-3 mb-3">
                <Form.Group className="flex-fill">
                  <Form.Label className="fw-bold text-muted small">출근 시간</Form.Label>
                  <div className="d-flex align-items-center gap-1">
                    <Form.Control type="number" min="0" max="23" value={startHour} onChange={e => setStartHour(e.target.value)} className="custom-input" /> :
                    <Form.Control type="number" min="0" max="59" value={startMin} onChange={e => setStartMin(e.target.value)} className="custom-input" />
                  </div>
                </Form.Group>
                <Form.Group className="flex-fill">
                  <Form.Label className="fw-bold text-muted small">퇴근 시간</Form.Label>
                  <div className="d-flex align-items-center gap-1">
                    <Form.Control type="number" min="0" max="23" value={endHour} onChange={e => setEndHour(e.target.value)} className="custom-input" /> :
                    <Form.Control type="number" min="0" max="59" value={endMin} onChange={e => setEndMin(e.target.value)} className="custom-input" />
                  </div>
                </Form.Group>
              </div>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">휴게 시간 (시:분)</Form.Label>
                <div className="d-flex align-items-center gap-1 w-50">
                  <Form.Control type="number" min="0" max="23" value={restHour} onChange={e => setRestHour(e.target.value)} className="custom-input" /> :
                  <Form.Control type="number" min="0" max="59" value={restMin} onChange={e => setRestMin(e.target.value)} className="custom-input" />
                </div>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold text-muted small">메모</Form.Label>
                <Form.Control as="textarea" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} className="custom-input" />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditRecord(null)} className="rounded-3">취소</Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={saving} className="rounded-3 px-3">
            {saving ? <Spinner size="sm" animation="border" /> : '저장'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 근무기록 전체 수정 이력 모달 */}
      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} centered scrollable size="lg">
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold fs-5">전체 근무 기록 수정 이력</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 bg-light">
          <Form onSubmit={handleHistorySearch} className="mb-4">
            <div className="d-flex gap-2 bg-white p-2 rounded-3 shadow-sm border">
              <Form.Control
                type="text"
                placeholder="직원 이름 또는 관리자 이름 검색"
                value={historySearchInput}
                onChange={e => setHistorySearchInput(e.target.value)}
                className="border-0 shadow-none bg-transparent"
              />
              <Button type="submit" variant="primary" className="rounded-3 px-3 d-flex align-items-center gap-1">
                <RiSearchLine size={18} /> 검색
              </Button>
            </div>
          </Form>

          {historyLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-5 text-muted bg-white rounded-3 border">
              수정 이력이 없습니다.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredHistory.map((log, idx) => {
                const { oldVal, newVal } = formatHistoryTime(log);
                const displayDate = log.wrhCreatedAt ? log.wrhCreatedAt.replace('T', ' ').substring(0, 16) : '';
                return (
                  <Card key={idx} className="border-0 shadow-sm rounded-3">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="fw-bold d-flex align-items-center gap-2">
                          <span className="text-dark">[{log.wrDate}] {log.targetUserName}님({log.workPlaceName || '지점'}) 기록</span>
                          <Badge bg="info" className="fw-normal bg-opacity-10 text-info border border-info">
                            {log.adminName || '관리자'} 수정
                          </Badge>
                        </div>
                        <span className="text-muted small">{displayDate}</span>
                      </div>
                      <div className="bg-light p-2 rounded-2 small text-muted font-monospace">
                        <span className="text-decoration-line-through me-2 text-danger">{oldVal}</span>
                        <RiArrowRightSLine className="mx-1" />
                        <span className="fw-bold text-success">{newVal}</span>
                      </div>
                      {log.afterStartTime === null && (
                        <div className="mt-2 text-end">
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="rounded-pill px-3 py-1 fw-bold d-flex align-items-center gap-1 ms-auto"
                            onClick={() => handleRestoreRecord(log.wrhIdx)}
                          >
                            <RiRefreshLine size={14} /> 복구
                          </Button>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top bg-white">
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)} className="rounded-3 px-4">닫기</Button>
        </Modal.Footer>
      </Modal>

      {/* 새 기록 추가 모달 */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-5">새 근무 기록 추가</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">직원 선택</Form.Label>
              <Form.Control
                type="text"
                placeholder="직원 이름 검색..."
                value={createWorkerSearch}
                onChange={e => setCreateWorkerSearch(e.target.value)}
                className="custom-input mb-2"
              />
              <Form.Select 
                value={createRecord.userIdx} 
                onChange={e => setCreateRecord({...createRecord, userIdx: e.target.value})} 
                className="custom-input"
                htmlSize={3}
              >
                <option value="" disabled>직원을 선택하세요</option>
                {createWorkers
                  .filter(w => (w.userName || '').toLowerCase().includes(createWorkerSearch.toLowerCase()))
                  .map(w => (
                  <option key={w.userIdx} value={w.userIdx}>{w.userName} ({w.email})</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">근무 날짜</Form.Label>
              <Form.Control 
                type="date" 
                value={createRecord.wrDate} 
                onChange={e => setCreateRecord({...createRecord, wrDate: e.target.value})} 
                className="custom-input"
              />
            </Form.Group>

            <div className="d-flex gap-3 mb-3">
              <Form.Group className="flex-fill">
                <Form.Label className="fw-bold text-muted small">출근 시간</Form.Label>
                <div className="d-flex align-items-center gap-1">
                  <Form.Control type="number" min="0" max="23" value={createRecord.startHour} onChange={e => setCreateRecord({...createRecord, startHour: e.target.value.padStart(2, '0')})} className="custom-input" /> :
                  <Form.Control type="number" min="0" max="59" value={createRecord.startMin} onChange={e => setCreateRecord({...createRecord, startMin: e.target.value.padStart(2, '0')})} className="custom-input" />
                </div>
              </Form.Group>
              <Form.Group className="flex-fill">
                <Form.Label className="fw-bold text-muted small">퇴근 시간</Form.Label>
                <div className="d-flex align-items-center gap-1">
                  <Form.Control type="number" min="0" max="23" value={createRecord.endHour} onChange={e => setCreateRecord({...createRecord, endHour: e.target.value.padStart(2, '0')})} className="custom-input" /> :
                  <Form.Control type="number" min="0" max="59" value={createRecord.endMin} onChange={e => setCreateRecord({...createRecord, endMin: e.target.value.padStart(2, '0')})} className="custom-input" />
                </div>
              </Form.Group>
            </div>
            
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">휴게 시간 (시:분)</Form.Label>
              <div className="d-flex align-items-center gap-1 w-50">
                <Form.Control type="number" min="0" max="23" value={createRecord.restHour} onChange={e => setCreateRecord({...createRecord, restHour: e.target.value.padStart(2, '0')})} className="custom-input" /> :
                <Form.Control type="number" min="0" max="59" value={createRecord.restMin} onChange={e => setCreateRecord({...createRecord, restMin: e.target.value.padStart(2, '0')})} className="custom-input" />
              </div>
            </Form.Group>
            
            <Form.Group className="mb-2">
              <Form.Label className="fw-bold text-muted small">메모</Form.Label>
              <Form.Control as="textarea" rows={2} value={createRecord.remarks} onChange={e => setCreateRecord({...createRecord, remarks: e.target.value})} className="custom-input" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)} className="rounded-3">취소</Button>
          <Button variant="primary" onClick={handleCreateRecord} disabled={saving} className="rounded-3 px-3">
            {saving ? <Spinner size="sm" animation="border" /> : '추가하기'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminRecords;
