import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Form, Button, Modal, Table, Alert } from 'react-bootstrap';
import { format, startOfWeek, addDays, subMonths, parseISO, getDay } from 'date-fns';
import { isHoliday } from 'holiday-kr';
import { RiFileList3Line, RiEyeLine, RiAddLine, RiDeleteBinLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { getMonthlyWorkApplyWorks, saveWorkApply, updateWorkApply } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import PageHeader from '../components/ui/PageHeader';
import './Main.css';
import Loading from '../components/Loading';

const DAY_LABELS = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토', 0: '일' };
const DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const cycleDayState = (block, day) => {
  const applied = block.days[day];
  const isOpen = block.openShift[day];
  if (!applied) {
    return {
      days: { ...block.days, [day]: true },
      openShift: { ...block.openShift, [day]: false }
    };
  }
  if (!isOpen) {
    return {
      days: block.days,
      openShift: { ...block.openShift, [day]: true }
    };
  }
  return {
    days: { ...block.days, [day]: false },
    openShift: { ...block.openShift, [day]: false }
  };
};

const PlaceSelect = ({ workPlaces, value, onChange }) => (
  <Form.Group className="mb-3">
    <Form.Label className="fw-bold text-muted small mb-1">근무지</Form.Label>
    <Form.Select
      className="custom-input"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {workPlaces.length === 0 && <option value="">지점 불러오는 중…</option>}
      {workPlaces.map(wp => (
        <option key={wp.wpIdx} value={wp.wpIdx}>{wp.wpName}</option>
      ))}
    </Form.Select>
  </Form.Group>
);

const ApplyWeekGrid = ({ monday, block, onCycleDay }) => (
  <div className="req-week-scroll">
    <div className="req-week-grid">
      {DAYS_ORDER.map((day, i) => {
        const date = addDays(monday, i);
        const dayNum = getDay(date);
        const isHoly = isHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate()) || dayNum === 0;
        const isSat = dayNum === 6 && !isHoly;
        const applied = block.days[day];
        const isOpen = applied && block.openShift[day];
        const cellState = !applied ? 'off' : isOpen ? 'open' : 'applied';
        const label = !applied ? '—' : isOpen ? '오픈' : '신청';
        return (
          <div key={day} className="req-week-day">
            <div className={`req-week-day-name ${isHoly ? 'text-danger' : isSat ? 'text-primary' : ''}`}>
              {DAY_LABELS[dayNum]}
            </div>
            <div className="req-week-day-date">{format(date, 'd')}</div>
            <button type="button" className={`req-day-cell ${cellState}`} onClick={() => onCycleDay(day)}>
              {label}
            </button>
          </div>
        );
      })}
    </div>
  </div>
);

const isPublicAssignment = (s) =>
  (s?.wsdStatus === '출근' || s?.wsdStatus === '배정' || s?.wsdStatus === '타지점근무') && s?.wsdIsConfirmed === true;

/** 빈 칸 (null / 레거시 미신청) — 신청 이력 없음 */
const isBlankStatus = (status) => !status || status === '미신청';

/** 알바생 비공개 (확정 미출근 등) — 이력에는 남기되 상태/시간 비공개 */
const isWorkerHiddenStatus = (status) => status === '미출근' || status === '미배정';

const toDateStr = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  if (Array.isArray(value) && value.length >= 3) {
    return `${value[0]}-${String(value[1]).padStart(2, '0')}-${String(value[2]).padStart(2, '0')}`;
  }
  return String(value);
};

const displayStatusLabel = (s) => {
  if (isPublicAssignment(s)) return '출근';
  if (s?.wsdStatus === '신청') return '신청';
  return '';
};

const Requests = () => {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  const nextMonday = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });
  const nextSunday = addDays(nextMonday, 6);
  const reqDate = format(nextMonday, 'yyyy-MM-dd');
  const weekRangeLabel = `${format(nextMonday, 'M/d')} – ${format(nextSunday, 'M/d')}`;

  const defaultBlock = (id) => ({
    id,
    workPlaceIdx: user?.workPlaceIdx || '',
    days: { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false },
    openShift: { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false },
    remarks: ''
  });

  const [requestBlocks, setRequestBlocks] = useState([defaultBlock(Date.now())]);
  const [workPlaces, setWorkPlaces] = useState([]);

  const [requestList, setRequestList] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [viewingRequest, setViewingRequest] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const [editTarget, setEditTarget] = useState(null);
  const [editBlocks, setEditBlocks] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [globalRemarks, setGlobalRemarks] = useState('');
  const [editGlobalRemarks, setEditGlobalRemarks] = useState('');
  const [nextWeekAlreadyApplied, setNextWeekAlreadyApplied] = useState(false);

  const refreshNextWeekApplied = async () => {
    const year = nextMonday.getFullYear();
    const month = nextMonday.getMonth() + 1;
    const res = await getMonthlyWorkApplyWorks(year, month, true);
    if (!res.success) {
      setNextWeekAlreadyApplied(false);
      return;
    }
    const mon = format(nextMonday, 'yyyy-MM-dd');
    const list = res.data || [];
    const has = list.some(sch => {
      if (isBlankStatus(sch.wsdStatus)) return false;
      const d = parseISO(toDateStr(sch.date) || sch.date);
      return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd') === mon;
    });
    setNextWeekAlreadyApplied(has);
  };

  useEffect(() => {
    fetchWorkPlaces(true).then(res => {
      if (res.success) setWorkPlaces(res.data);
    });
    refreshNextWeekApplied();
  }, []);

  const loadRequests = async (monthStr) => {
    setDataLoading(true);
    const [year, month] = monthStr.split('-');
    try {
      const res = await getMonthlyWorkApplyWorks(parseInt(year, 10), parseInt(month, 10));
      if (res.success) {
        setRequestList(res.data || []);
      }
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(selectedMonth);
  }, [selectedMonth]);

  const handleAddBlock = () => {
    setRequestBlocks(prev => [...prev, defaultBlock(Date.now())]);
  };

  const handleRemoveBlock = (id) => {
    if (requestBlocks.length <= 1) return;
    setRequestBlocks(prev => prev.filter(b => b.id !== id));
  };

  const updateBlock = (id, field, value) => {
    setRequestBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const cycleBlockDay = (id, day) => {
    setRequestBlocks(prev => prev.map(b => {
      if (b.id !== id) return b;
      return { ...b, ...cycleDayState(b, day) };
    }));
  };

  const weeklyGroups = useMemo(() => {
    const groups = {};
    requestList.forEach(sch => {
      if (isBlankStatus(sch.wsdStatus)) return;
      const d = parseISO(sch.date);
      const monDate = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!groups[monDate]) groups[monDate] = [];
      groups[monDate].push(sch);
    });
    return Object.entries(groups).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  }, [requestList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nextWeekAlreadyApplied) {
      alert('이미 신청한 주입니다. 아래 내역에서 수정해 주세요.');
      return;
    }
    const hasAnyDay = requestBlocks.some(b => Object.values(b.days).some(v => v));
    if (!hasAnyDay) {
      alert('신청할 요일을 최소 하나 이상 선택해주세요.');
      return;
    }

    setLoading(true);
    const mondayDateObj = startOfWeek(new Date(reqDate), { weekStartsOn: 1 });
    const sundayDateObj = addDays(mondayDateObj, 6);
    const startDateStr = format(mondayDateObj, 'yyyy-MM-dd');
    const endDateStr = format(sundayDateObj, 'yyyy-MM-dd');

    const requestData = [];

    requestBlocks.forEach(block => {
      const openTrueDates = [];
      const openFalseDates = [];

      DAYS_ORDER.forEach((dayKey, idx) => {
        if (block.days[dayKey]) {
          const dStr = format(addDays(mondayDateObj, idx), 'yyyy-MM-dd');
          if (block.openShift[dayKey]) {
            openTrueDates.push(dStr);
          } else {
            openFalseDates.push(dStr);
          }
        }
      });

      if (openTrueDates.length > 0) {
        requestData.push({
          workPlaceIdx: Number(block.workPlaceIdx),
          remarks: globalRemarks,
          openApplied: true,
          applyDates: openTrueDates
        });
      }
      if (openFalseDates.length > 0) {
        requestData.push({
          workPlaceIdx: Number(block.workPlaceIdx),
          remarks: globalRemarks,
          openApplied: false,
          applyDates: openFalseDates
        });
      }
    });

    try {
      const res = await saveWorkApply(startDateStr, endDateStr, requestData);
      setLoading(false);
      if (res.success) {
        alert('근무 신청이 완료되었습니다.');
        setRequestBlocks([defaultBlock(Date.now())]);
        setGlobalRemarks('');
        loadRequests(selectedMonth);
        refreshNextWeekApplied();
      } else {
        alert(res.error || '근무 신청에 실패했습니다.');
      }
    } catch (err) {
      setLoading(false);
      alert('근무 신청 중 오류가 발생했습니다.');
    }
  };

  const displayOpenTime = (s, dateObj) => {
    const isHoli = isHoliday(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
    if (s.wsdStartTime === '오픈' || s.isOpen === true || s.openApplied === true || s.wsdIsOpen === true) {
      const d = getDay(dateObj);
      return (d === 0 || d === 6 || isHoli) ? '10:00 (오픈)' : '16:00 (오픈)';
    }
    return s.wsdStartTime ? `${String(s.wsdStartTime).substring(0, 5)} 출근` : '';
  };

  const handleOpenEdit = (monDate, weekSchs) => {
    const hasConfirmed = weekSchs.some(isPublicAssignment);
    if (hasConfirmed) {
      alert('이미 배정이 확정된 주차는 수정할 수 없습니다.');
      return;
    }

    // Group existing requests by workPlaceIdx to recreate blocks
    const branchGroups = {};
    weekSchs.forEach(s => {
      // 신청 당시 선택한 지점 정보를 최우선으로 사용하여 블록을 분리합니다.
      const wpIdx = s.applyWorkPlaceIdx || s.wsdWorkPlaceIdx || user?.workPlaceIdx;
      if (!branchGroups[wpIdx]) {
        branchGroups[wpIdx] = {
          id: Math.random(),
          workPlaceIdx: wpIdx,
          days: { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false },
          openShift: { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false },
          remarks: s.wsdRemarks || ''
        };
      }
      const dayOfWeek = getDay(parseISO(s.date));
      const key = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
      if (key) {
        branchGroups[wpIdx].days[key] = true;
        branchGroups[wpIdx].openShift[key] = s.wsdStartTime === '오픈' || s.isOpen === true || s.openApplied === true || s.wsdIsOpen === true;
      }
    });

    const blocks = Object.values(branchGroups);
    blocks.sort((a, b) => {
      const home = Number(user?.workPlaceIdx);
      const aHome = Number(a.workPlaceIdx) === home ? 0 : 1;
      const bHome = Number(b.workPlaceIdx) === home ? 0 : 1;
      return aHome - bHome;
    });
    setEditBlocks(blocks.length > 0 ? blocks : [defaultBlock(Date.now())]);
    const existingRemark = weekSchs.find(s => s.wsdRemarks || s.remarks)?.wsdRemarks || weekSchs.find(s => s.wsdRemarks || s.remarks)?.remarks || '';
    setEditGlobalRemarks(existingRemark);
    setEditTarget({ monDate, weekSchs });
  };

  const cycleEditBlockDay = (id, day) => {
    setEditBlocks(prev => prev.map(b => {
      if (b.id !== id) return b;
      return { ...b, ...cycleDayState(b, day) };
    }));
  };

  const handleEditSubmit = async () => {
    const hasAnyDay = editBlocks.some(b => Object.values(b.days).some(v => v));
    if (!hasAnyDay) {
      alert('신청할 요일을 하나 이상 선택해주세요.');
      return;
    }
    setEditLoading(true);
    const mondayDateObj = parseISO(editTarget.monDate);
    const sundayDateObj = addDays(mondayDateObj, 6);
    const startDateStr = format(mondayDateObj, 'yyyy-MM-dd');
    const endDateStr = format(sundayDateObj, 'yyyy-MM-dd');

    const requestData = [];
    editBlocks.forEach(block => {
      const openTrueDates = [];
      const openFalseDates = [];

      DAYS_ORDER.forEach((dayKey, idx) => {
        if (block.days[dayKey]) {
          const dStr = format(addDays(mondayDateObj, idx), 'yyyy-MM-dd');
          if (block.openShift[dayKey]) {
            openTrueDates.push(dStr);
          } else {
            openFalseDates.push(dStr);
          }
        }
      });

      if (openTrueDates.length > 0) {
        requestData.push({
          workPlaceIdx: Number(block.workPlaceIdx),
          remarks: editGlobalRemarks,
          openApplied: true,
          applyDates: openTrueDates
        });
      }
      if (openFalseDates.length > 0) {
        requestData.push({
          workPlaceIdx: Number(block.workPlaceIdx),
          remarks: editGlobalRemarks,
          openApplied: false,
          applyDates: openFalseDates
        });
      }
    });

    try {
      const res = await updateWorkApply(startDateStr, endDateStr, requestData);
      setEditLoading(false);
      if (res.success) {
        alert('근무 신청이 수정되었습니다.');
        setEditTarget(null);
        loadRequests(selectedMonth);
        refreshNextWeekApplied();
      } else {
        alert(res.error || '수정에 실패했습니다.');
      }
    } catch (err) {
      setEditLoading(false);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  return (
    <Container className="py-4 py-md-5 mb-5">
      <PageHeader title="근무 신청" />
      <p className="text-muted small mb-3" style={{ marginTop: '-0.35rem' }}>
        칸을 눌러 신청하고, 한 번 더 누르면 오픈입니다.
      </p>

      <Card className="req-apply-card mb-4">
        <Card.Body className="p-3 p-md-4">
          <Form onSubmit={handleSubmit}>
            <div className="mb-3">
              <div className="req-apply-week-label">다음 주 {weekRangeLabel}</div>
              <div className="req-apply-week-hint">다음 주만 신청할 수 있습니다</div>
            </div>

            <div className="req-legend mb-3" aria-hidden="true">
              <span className="req-legend-item"><span className="req-legend-swatch off" />—</span>
              <span className="req-legend-item"><span className="req-legend-swatch applied" />신청</span>
              <span className="req-legend-item"><span className="req-legend-swatch open" />오픈</span>
            </div>

            {requestBlocks.map((block) => (
              <div key={block.id} className="req-apply-block mb-3">
                {requestBlocks.length > 1 && (
                  <Button
                    type="button"
                    variant="link"
                    className="position-absolute top-0 end-0 text-danger p-2"
                    onClick={() => handleRemoveBlock(block.id)}
                  >
                    <RiDeleteBinLine size={20} />
                  </Button>
                )}

                <PlaceSelect
                  workPlaces={workPlaces}
                  value={block.workPlaceIdx}
                  onChange={(wpIdx) => updateBlock(block.id, 'workPlaceIdx', wpIdx)}
                />

                <ApplyWeekGrid
                  monday={nextMonday}
                  block={block}
                  onCycleDay={(day) => cycleBlockDay(block.id, day)}
                />
              </div>
            ))}
            <Form.Group>
              <Form.Label className="fw-bold text-muted small">비고</Form.Label>
              <Form.Control
                  type="text"
                  value={globalRemarks}
                  onChange={(e) => setGlobalRemarks(e.target.value)}
                  className="custom-input mb-3"
                  placeholder="해당 주간에 전달할 메모"
              />
            </Form.Group>
            <Button
              type="button"
              variant="outline-secondary"
              className="w-100 mb-3 py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
              onClick={handleAddBlock}
            >
              <RiAddLine size={20} /> 타 지점 추가 신청하기
            </Button>

            {nextWeekAlreadyApplied && (
              <Alert variant="warning" className="py-2 small fw-bold">
                이미 신청한 주입니다. 신규 제출 대신 아래 내역의 「수정」을 이용해 주세요.
              </Alert>
            )}

            <Button disabled={loading || nextWeekAlreadyApplied} type="submit" className="w-100 py-3 fw-bold fs-6 btn-primary">
              {loading ? '신청 중...' : nextWeekAlreadyApplied ? '이미 신청한 주' : '근무 신청서 일괄 제출하기'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
        <div className="d-flex align-items-center gap-2 fw-bold fs-5" style={{ color: 'var(--color-text-main)' }}>
          <RiFileList3Line style={{ color: 'var(--color-primary)' }} /> 내 신청 내역
        </div>
        <Form.Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="custom-month-select fw-bold w-auto">
          {[...Array(12)].map((_, i) => {
            const optDate = addDays(subMonths(new Date(), 6 - i), 0);
            const val = format(optDate, 'yyyy-MM');
            return <option key={val} value={val}>{format(optDate, 'yyyy년 M월')}</option>;
          })}
        </Form.Select>
      </div>

      {dataLoading ? <Loading /> : (
        <div className="d-flex flex-column gap-3">
          {weeklyGroups.length === 0 ? (
            <div
              className="text-center py-5 text-muted"
              style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
            >
              신청 내역이 없습니다.
            </div>
          ) : (
            weeklyGroups.map(([monDate, weekSchs]) => {
              const weekEnd = addDays(parseISO(monDate), 6);
              const uniqueApplyDates = new Set(weekSchs.map(s => toDateStr(s.date)));
              const assignedDaysCount = new Set(weekSchs.filter(isPublicAssignment).map(s => toDateStr(s.date))).size;
              const weekCells = Array.from({ length: 7 }, (_, i) => {
                const date = addDays(parseISO(monDate), i);
                const dateStr = format(date, 'yyyy-MM-dd');
                const slots = weekSchs.filter(s => {
                  const st = s.wsdStatus;
                  return toDateStr(s.date) === dateStr && !isBlankStatus(st) && !isWorkerHiddenStatus(st);
                });
                return { date, dateStr, slots };
              });

              return (
                <Card key={monDate} className="req-history-card">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                      <div>
                        <div className="req-history-range">
                          {format(parseISO(monDate), 'M/d')} – {format(weekEnd, 'M/d')}
                        </div>
                        <div className="req-history-meta">
                          신청 {uniqueApplyDates.size}일
                          {assignedDaysCount > 0 ? ` · 출근 ${assignedDaysCount}일` : ' · 출근 대기'}
                        </div>
                      </div>
                      <div className="d-flex gap-2 flex-shrink-0">
                        <Button variant="light" className="req-icon-btn p-2" onClick={() => setViewingRequest({ monDate, weekSchs })}>
                          <RiEyeLine size={20} />
                        </Button>
                        {!weekSchs.some(isPublicAssignment) && (
                          <Button variant="outline-warning" size="sm" className="fw-bold px-3" onClick={() => handleOpenEdit(monDate, weekSchs)}>
                            수정
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="req-week-scroll">
                    <div className="req-week-grid">
                      {weekCells.map(({ date, dateStr, slots }) => {
                        const dayNum = getDay(date);
                        const isHoly = isHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate()) || dayNum === 0;
                        const isSat = dayNum === 6 && !isHoly;
                        return (
                          <div key={dateStr} className="req-week-day">
                            <div className={`req-week-day-name ${isHoly ? 'text-danger' : isSat ? 'text-primary' : ''}`}>
                              {DAY_LABELS[dayNum]}
                            </div>
                            <div className="req-week-day-date">{format(date, 'd')}</div>
                            {slots.length === 0 ? (
                              <div className="req-chip empty">—</div>
                            ) : slots.map((s, idx) => {
                              const assigned = isPublicAssignment(s);
                              const isOp = s.wsdStartTime === '오픈' || s.isOpen === true || s.openApplied === true || s.wsdIsOpen === true;
                              const wpName = s.wsdWorkPlaceName || s.applyWorkPlaceName;
                              const slotWpIdx = assigned
                                ? (s.wsdWorkPlaceIdx || s.applyWorkPlaceIdx)
                                : (s.applyWorkPlaceIdx || s.wsdWorkPlaceIdx);
                              const showWp = slots.length > 1 || Number(slotWpIdx) !== Number(user?.workPlaceIdx);
                              return (
                                <div key={`${dateStr}-${idx}`} className={`req-chip ${assigned ? 'work' : 'applied'}`}>
                                  {assigned ? (displayOpenTime(s, date) || '출근') : (isOp ? displayOpenTime(s, date) : '신청')}
                                  {showWp && wpName && <span className="req-chip-wp">{wpName}</span>}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  </Card.Body>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 수정 모달 */}
      <Modal show={!!editTarget} onHide={() => setEditTarget(null)} centered size="lg">
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold fs-5">
            근무 신청 수정
            {editTarget && (
              <div className="req-apply-week-hint mt-1">
                {format(parseISO(editTarget.monDate), 'M/d')} – {format(addDays(parseISO(editTarget.monDate), 6), 'M/d')}
              </div>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3 p-md-4">
          <div className="req-legend mb-3" aria-hidden="true">
            <span className="req-legend-item"><span className="req-legend-swatch off" />—</span>
            <span className="req-legend-item"><span className="req-legend-swatch applied" />신청</span>
            <span className="req-legend-item"><span className="req-legend-swatch open" />오픈</span>
          </div>
          {editBlocks.map((block) => (
            <div key={block.id} className="req-apply-block mb-3">
              {editBlocks.length > 1 && (
                <Button
                  variant="link"
                  className="position-absolute top-0 end-0 text-danger p-2"
                  onClick={() => setEditBlocks(prev => prev.filter(b => b.id !== block.id))}
                >
                  <RiDeleteBinLine size={20} />
                </Button>
              )}

              <PlaceSelect
                workPlaces={workPlaces}
                value={block.workPlaceIdx}
                onChange={(wpIdx) => setEditBlocks(prev => prev.map(b => b.id === block.id ? { ...b, workPlaceIdx: wpIdx } : b))}
              />

              {editTarget && (
                <ApplyWeekGrid
                  monday={parseISO(editTarget.monDate)}
                  block={block}
                  onCycleDay={(day) => cycleEditBlockDay(block.id, day)}
                />
              )}
            </div>
          ))}
          <Button
            variant="outline-secondary"
            className="w-100 py-2 mb-3 fw-bold d-flex align-items-center justify-content-center gap-2"
            onClick={() => setEditBlocks(prev => [...prev, defaultBlock(Date.now())])}
          >
            <RiAddLine size={20} /> 타 지점 추가 신청하기
          </Button>
          <Form.Group>
            <Form.Label className="fw-bold text-muted small">비고</Form.Label>
            <Form.Control type="text" value={editGlobalRemarks} onChange={e => setEditGlobalRemarks(e.target.value)} placeholder="해당 주간에 전달할 메모" className="custom-input" />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="secondary" onClick={() => setEditTarget(null)}>취소</Button>
          <Button variant="primary" onClick={handleEditSubmit} disabled={editLoading} className="fw-bold">
            {editLoading ? '수정 중...' : '수정 완료'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 상세보기 모달 */}
      <Modal show={!!viewingRequest} onHide={() => setViewingRequest(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-5">
            {viewingRequest ? `${viewingRequest.monDate} ~ ${format(addDays(parseISO(viewingRequest.monDate), 6), 'yyyy-MM-dd')} 상세` : ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table bordered hover className="text-center">
            <thead>
              <tr><th>날짜</th><th>상태</th><th>출근 시간</th><th>근무 지점</th></tr>
            </thead>
            <tbody>
              {viewingRequest && Object.values(
                viewingRequest.weekSchs.reduce((acc, s) => {
                  const key = `${s.date}_${s.applyWorkPlaceIdx || s.wsdWorkPlaceIdx || 'none'}`;
                  // If we already have a record for this date+branch, prefer the one that is actually applied/assigned
                  if (!acc[key] || (!isBlankStatus(s.wsdStatus) && isBlankStatus(acc[key].wsdStatus))) {
                    acc[key] = s;
                  }
                  return acc;
                }, {})
              ).sort((a, b) => new Date(a.date) - new Date(b.date)).map(s => {
                const dateObj = parseISO(s.date);
                return (
                  <tr key={s.wsdIdx || `${s.date}_${s.applyWorkPlaceIdx || s.wsdWorkPlaceIdx}`}>
                    <td>{`${format(dateObj, 'MM/dd')} (${DAY_LABELS[getDay(dateObj)]})`}</td>
                    <td><span className={`req-status-badge ${isPublicAssignment(s) ? 'work' : s.wsdStatus === '신청' ? 'applied' : 'muted'}`}>{displayStatusLabel(s)}</span></td>
                    <td>{isPublicAssignment(s) ? (displayOpenTime(s, dateObj) || '-') : '-'}</td>
                    <td>{s.wsdWorkPlaceName || s.applyWorkPlaceName || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Requests;
