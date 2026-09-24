import { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Button, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { format } from 'date-fns';
import { RiSearchLine, RiErrorWarningLine, RiTimeLine, RiUserSearchLine } from 'react-icons/ri';
import { fetchAdminWorkers } from '../api/authApi';
import { createWorkRecord } from '../api/workApi';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const REST_HOURS = HOURS.slice(0, 10);
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const toMinutes = (h, m) => Number(h) * 60 + Number(m);

const defaultDate = (selectedMonth) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (!selectedMonth || today.startsWith(selectedMonth)) return today;
  return `${selectedMonth}-01`;
};

const initialForm = (selectedMonth) => ({
  wrDate: defaultDate(selectedMonth),
  wpIdx: '',
  startHour: '09', startMin: '00',
  endHour: '18', endMin: '00',
  restHour: '01', restMin: '00',
  remarks: ''
});

const StatusBadge = ({ isActive }) => {
  if (isActive === 2) return <Badge bg="warning" className="ms-1">휴직</Badge>;
  if (isActive === 0) return <Badge bg="dark" className="ms-1">퇴사</Badge>;
  return null;
};

const WorkerName = ({ w }) => (
  <>
    {w.userName}
    {Number(w.nameSeq) > 1 && <Badge bg="secondary" className="ms-1">#{w.userIdx}</Badge>}
    <StatusBadge isActive={w.userIsActive} />
  </>
);

const TimeSelect = ({ label, hour, minute, hours = HOURS, onHour, onMinute }) => (
  <Form.Group>
    <Form.Label className="fw-bold text-muted small">{label}</Form.Label>
    <div className="d-flex align-items-center gap-1">
      <Form.Select value={hour} onChange={e => onHour(e.target.value)} className="custom-input" aria-label={`${label} 시`}>
        {hours.map(h => <option key={h} value={h}>{h}</option>)}
      </Form.Select>
      <span className="fw-bold text-muted">:</span>
      <Form.Select value={minute} onChange={e => onMinute(e.target.value)} className="custom-input" aria-label={`${label} 분`}>
        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
      </Form.Select>
    </div>
  </Form.Group>
);

const AdminCreateRecordModal = ({ show, onHide, onCreated, branches, selectedMonth }) => {
  const [form, setForm] = useState(() => initialForm(selectedMonth));
  const [worker, setWorker] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [workers, setWorkers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [saving, setSaving] = useState(false);

  const workPlaces = branches.filter(b => b.wpIdx != null);
  const setField = (key) => (value) => setForm(f => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!show) return;
    setForm(initialForm(selectedMonth));
    setWorker(null);
    setKeyword('');
    setSearchError('');
  }, [show]);

  useEffect(() => {
    if (!show || worker) return;
    let cancelled = false;
    const term = keyword.trim();
    const timer = setTimeout(async () => {
      setSearching(true);
      const params = { page: 0, size: 20 };
      if (term) params.userName = term;
      const res = await fetchAdminWorkers(params);
      if (cancelled) return;
      if (res.success) {
        setWorkers(Array.isArray(res.data) ? res.data : (res.data?.content || []));
        setSearchError('');
      } else {
        setWorkers([]);
        setSearchError(res.error || '직원 목록을 불러오지 못했습니다.');
      }
      setSearching(false);
    }, term ? 300 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [show, keyword, worker]);

  const homeWpIdx = (w) => {
    if (w?.workPlaceIdx != null) return String(w.workPlaceIdx);
    const match = workPlaces.find(b => b.wpName === w?.workPlaceName);
    return match ? String(match.wpIdx) : '';
  };

  const selectWorker = (w) => {
    setWorker(w);
    setForm(f => ({ ...f, wpIdx: homeWpIdx(w) }));
  };

  const summary = useMemo(() => {
    const start = toMinutes(form.startHour, form.startMin);
    const end = toMinutes(form.endHour, form.endMin);
    const span = (end < start ? end + 1440 : end) - start;
    const work = span - toMinutes(form.restHour, form.restMin);
    let error = '';
    if (span === 0) error = '출근 시간과 퇴근 시간이 같습니다.';
    else if (work <= 0) error = '휴게 시간이 근무 시간보다 길거나 같습니다.';
    return { overnight: end < start, work, error };
  }, [form.startHour, form.startMin, form.endHour, form.endMin, form.restHour, form.restMin]);

  const isHome = worker && form.wpIdx && form.wpIdx === homeWpIdx(worker);
  const canSubmit = !!worker && !!form.wrDate && !!form.wpIdx && !summary.error && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    const res = await createWorkRecord({
      userIdx: worker.userIdx,
      workPlaceIdx: Number(form.wpIdx),
      wrDate: form.wrDate,
      wrStartTime: `${form.startHour}:${form.startMin}`,
      wrEndTime: `${form.endHour}:${form.endMin}`,
      wrRestTime: `${form.restHour}:${form.restMin}`,
      wrRemarks: form.remarks.trim()
    });
    setSaving(false);
    if (res.success) {
      alert('근무 기록이 추가되었습니다.');
      onCreated();
    } else {
      alert(res.error || '추가에 실패했습니다.');
    }
  };

  return (
    <Modal show={show} onHide={() => !saving && onHide()} centered className="create-record-modal">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="border-bottom">
          <div>
            <Modal.Title className="fw-bold text-dark fs-5">새 근무 기록 추가</Modal.Title>
            <div className="text-muted small">관리자 권한으로 직원의 근무 기록을 직접 등록합니다.</div>
          </div>
        </Modal.Header>

        <Modal.Body className="p-4 d-flex flex-column gap-4">
          <section>
            <div className="crm-section-title"><span className="crm-step">1</span>직원</div>
            {worker ? (
              <div className="crm-selected-worker">
                <span className="crm-avatar">{worker.userName?.[0] || '?'}</span>
                <div className="flex-grow-1 overflow-hidden">
                  <div className="fw-bold text-dark"><WorkerName w={worker} /></div>
                  <div className="small text-muted text-truncate">
                    {worker.workPlaceName || '소속 없음'}{worker.userId ? ` · ${worker.userId}` : ''}
                  </div>
                </div>
                <Button size="sm" variant="outline-secondary" className="rounded-pill px-3 fw-bold" onClick={() => setWorker(null)} disabled={saving}>
                  변경
                </Button>
              </div>
            ) : (
              <>
                <div className="crm-search">
                  <RiSearchLine size={16} className="crm-search-icon" />
                  <Form.Control
                    type="text"
                    placeholder="직원 이름으로 검색"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    className="custom-input"
                    autoFocus
                  />
                </div>
                <div className="crm-worker-list">
                  {searching ? (
                    <div className="crm-list-state"><Spinner size="sm" animation="border" /> 불러오는 중...</div>
                  ) : searchError ? (
                    <div className="crm-list-state text-danger">{searchError}</div>
                  ) : workers.length === 0 ? (
                    <div className="crm-list-state">
                      <RiUserSearchLine size={20} />
                      {keyword.trim() ? `'${keyword.trim()}'에 해당하는 직원이 없습니다.` : '등록된 직원이 없습니다.'}
                    </div>
                  ) : (
                    workers.map(w => (
                      <button type="button" key={w.userIdx} className="crm-worker-item" onClick={() => selectWorker(w)}>
                        <span className="crm-avatar sm">{w.userName?.[0] || '?'}</span>
                        <span className="flex-grow-1 text-start overflow-hidden">
                          <span className="d-block fw-bold text-dark text-truncate"><WorkerName w={w} /></span>
                          {w.userId && <span className="d-block small text-muted text-truncate">{w.userId}</span>}
                        </span>
                        <Badge bg="light" className="text-dark border flex-shrink-0">{w.workPlaceName || '-'}</Badge>
                      </button>
                    ))
                  )}
                </div>
                {!searching && workers.length >= 20 && (
                  <div className="small text-muted mt-1">상위 20명만 표시됩니다. 이름을 더 입력해 좁혀주세요.</div>
                )}
              </>
            )}
          </section>

          <section>
            <div className="crm-section-title"><span className="crm-step">2</span>근무 정보</div>
            <Row className="g-3">
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="fw-bold text-muted small">근무 날짜</Form.Label>
                  <Form.Control type="date" value={form.wrDate} onChange={e => setField('wrDate')(e.target.value)} className="custom-input" required />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="fw-bold text-muted small">근무지</Form.Label>
                  <Form.Select value={form.wpIdx} onChange={e => setField('wpIdx')(e.target.value)} className="custom-input" disabled={!worker}>
                    <option value="">{worker ? '근무지 선택' : '직원을 먼저 선택'}</option>
                    {workPlaces.map(b => (
                      <option key={b.wpIdx} value={String(b.wpIdx)}>
                        {b.wpName}{worker && String(b.wpIdx) === homeWpIdx(worker) ? ' (소속)' : ''}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            {worker && form.wpIdx && (
              <div className={`small mt-2 fw-semibold ${isHome ? 'text-success' : 'text-warning'}`}>
                {isHome ? '소속 지점 근무' : `타지점 근무 (소속: ${worker.workPlaceName || '-'})`}
              </div>
            )}
          </section>

          <section>
            <div className="crm-section-title"><span className="crm-step">3</span>근무 시간</div>
            <div className="crm-time-grid">
              <TimeSelect label="출근" hour={form.startHour} minute={form.startMin} onHour={setField('startHour')} onMinute={setField('startMin')} />
              <TimeSelect label="퇴근" hour={form.endHour} minute={form.endMin} onHour={setField('endHour')} onMinute={setField('endMin')} />
              <TimeSelect label="휴게 (시간:분)" hour={form.restHour} minute={form.restMin} hours={REST_HOURS} onHour={setField('restHour')} onMinute={setField('restMin')} />
              <div className={`crm-summary ${summary.error ? 'is-error' : ''}`}>
                {summary.error ? (
                  <><RiErrorWarningLine size={18} className="flex-shrink-0" /><span>{summary.error}</span></>
                ) : (
                  <>
                    <RiTimeLine size={18} className="flex-shrink-0" />
                    <span>
                      총 <strong>{Math.floor(summary.work / 60)}시간{summary.work % 60 ? ` ${summary.work % 60}분` : ''}</strong>
                    </span>
                    {summary.overnight && <Badge bg="info" className="ms-auto">익일 퇴근</Badge>}
                  </>
                )}
              </div>
            </div>
          </section>

          <section>
            <Form.Group>
              <Form.Label className="fw-bold text-muted small">메모 (선택)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="추가 사유 등 특이사항"
                value={form.remarks}
                onChange={e => setField('remarks')(e.target.value)}
                className="custom-input"
              />
            </Form.Group>
          </section>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={saving} className="rounded-3">취소</Button>
          <Button type="submit" variant="primary" disabled={!canSubmit} className="rounded-3 px-4 fw-bold">
            {saving ? <Spinner as="span" animation="border" size="sm" /> : '추가하기'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AdminCreateRecordModal;
