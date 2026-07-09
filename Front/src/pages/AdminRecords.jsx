import { useState, useEffect } from 'react';
import { Container, ButtonGroup, ToggleButton, Card, Table, Button, Spinner, Modal, Form } from 'react-bootstrap';
import { fetchWorkRecords, updateWorkRecord, downloadWorkRecordExcel } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import { format } from 'date-fns';
import './AdminMain.css';

const AdminRecords = () => {
  const [selectedBranch, setSelectedBranch] = useState('전체');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [workRecords, setWorkRecords] = useState([]);
  const [branches, setBranches] = useState(['전체']);
  const [loading, setLoading] = useState(true);

  // Pagination & Sorting states
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
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

  const loadBranches = async () => {
    const branchRes = await fetchWorkPlaces();
    if (branchRes.success) {
      setBranches(['전체', ...branchRes.data.map(b => b.wpName)]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    let workPlaceIdx = null;
    if (selectedBranch !== '전체') {
      if (selectedBranch.includes('노란')) workPlaceIdx = 1;
      else if (selectedBranch.includes('약산')) workPlaceIdx = 2;
    }

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
      workPlaceIdx: workPlaceIdx || undefined,
      year: year || undefined,
      month: month || undefined
    };

    const recRes = await fetchWorkRecords(params);
    if (recRes.success) {
      setWorkRecords(recRes.data.content || recRes.data || []);
      setTotalPages(recRes.data.totalPages || 1);
    }
    setLoading(false);
  };

  useEffect(() => { loadBranches(); }, []);
  useEffect(() => { loadData(); }, [page, sortBy, sortDir, searchTerm, selectedBranch, selectedMonth]);

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

    // 지점명 -> workPlaceIdx 매핑 (전체이면 null)
    let workPlaceIdx = null;
    if (selectedBranch !== '전체') {
      // 노란돼지=1, 약산돼지=2 (간단 매핑)
      if (selectedBranch.includes('노란')) workPlaceIdx = 1;
      else if (selectedBranch.includes('약산')) workPlaceIdx = 2;
    }

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
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
          <h2 className="fw-bold text-dark mb-2 mb-md-0">근무 기록 관리</h2>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Form onSubmit={handleSearch} className="d-flex align-items-center gap-1 me-2">
              <Form.Control
                type="text"
                placeholder="직원 이름 검색"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{ width: '150px' }}
                className="fw-bold"
              />
              <Button type="submit" variant="primary" className="fw-bold">검색</Button>
            </Form>
            <Form.Control 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              className="fw-bold text-primary"
              style={{ width: '150px' }}
            />
            <ButtonGroup>
              {branches.map((b, idx) => (
                <ToggleButton
                  key={idx}
                  id={`rec-branch-${idx}`}
                  type="radio"
                  variant={selectedBranch === b ? "primary" : "outline-primary"}
                  name="recBranchRadio"
                  value={b}
                  checked={selectedBranch === b}
                  onChange={e => setSelectedBranch(e.currentTarget.value)}
                  className="px-3 fw-bold"
                >
                  {b}
                </ToggleButton>
              ))}
            </ButtonGroup>
            <Button 
              variant="success" 
              className="fw-bold d-flex align-items-center gap-1" 
              onClick={handleDownloadExcel}
              disabled={downloading}
            >
              {downloading ? '다운로드 중...' : '📄 엑셀 다운로드'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="p-4">
              {filteredRecords.length === 0 ? (
                <div className="text-center text-muted py-5">
                  해당 조건의 근무 기록이 없습니다.
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>No.</th>
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
                            <td className="text-muted">{page * 10 + idx + 1}</td>
                            <td className="fw-bold">{formatDateStr(r.wrDate)}</td>
                            <td>{r.workPlaceName || '-'}</td>
                            <td><span className="fw-bold text-primary">{r.userName || `사원(${r.userIdx})`}</span></td>
                            <td>{formatTimeStr(r.wrStartTime)}</td>
                            <td>{formatTimeStr(r.wrEndTime)}</td>
                            <td>{formatTimeStr(r.wrRestTime)}</td>
                            <td className="fw-bold text-success">{totalHours.toFixed(1)}시간</td>
                            <td className="small text-truncate" style={{ maxWidth: '150px' }}>{r.wrRemarks || '-'}</td>
                            <td>
                              <Button size="sm" variant="outline-primary" className="rounded-pill fw-bold" onClick={() => openEditModal(r)}>
                                수정
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
              <div className="d-flex justify-content-center mt-4">
                <ButtonGroup size="sm">
                  <Button variant="outline-primary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    이전
                  </Button>
                  <Button variant="primary" disabled>
                    {page + 1} / {totalPages}
                  </Button>
                  <Button variant="outline-primary" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
                    다음
                  </Button>
                </ButtonGroup>
              </div>
            </Card.Body>
          </Card>
        )}
      </Container>

      {/* 수정 모달 */}
      <Modal show={!!editRecord} onHide={() => setEditRecord(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">근무 기록 수정</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editRecord && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">직원 및 날짜</Form.Label>
                <div>
                  <span className="fw-bold text-primary">{editRecord.userName}</span> / {formatDateStr(editRecord.wrDate)}
                </div>
              </Form.Group>
              <div className="d-flex gap-3 mb-3">
                <Form.Group className="flex-fill">
                  <Form.Label className="fw-bold text-muted small">출근 시간</Form.Label>
                  <div className="d-flex align-items-center gap-1">
                    <Form.Control type="number" min="0" max="23" value={startHour} onChange={e => setStartHour(e.target.value)} /> :
                    <Form.Control type="number" min="0" max="59" value={startMin} onChange={e => setStartMin(e.target.value)} />
                  </div>
                </Form.Group>
                <Form.Group className="flex-fill">
                  <Form.Label className="fw-bold text-muted small">퇴근 시간</Form.Label>
                  <div className="d-flex align-items-center gap-1">
                    <Form.Control type="number" min="0" max="23" value={endHour} onChange={e => setEndHour(e.target.value)} /> :
                    <Form.Control type="number" min="0" max="59" value={endMin} onChange={e => setEndMin(e.target.value)} />
                  </div>
                </Form.Group>
              </div>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">휴게 시간 (시:분)</Form.Label>
                <div className="d-flex align-items-center gap-1 w-50">
                  <Form.Control type="number" min="0" max="23" value={restHour} onChange={e => setRestHour(e.target.value)} /> :
                  <Form.Control type="number" min="0" max="59" value={restMin} onChange={e => setRestMin(e.target.value)} />
                </div>
              </Form.Group>
              <Form.Group>
                <Form.Label className="fw-bold text-muted small">메모</Form.Label>
                <Form.Control as="textarea" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditRecord(null)}>취소</Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" /> : '저장'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminRecords;
