import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Form, Button, Modal, Table, Alert, Dropdown, ButtonGroup } from 'react-bootstrap';
import { format, startOfWeek, addDays, subMonths, addMonths, parseISO, getDay } from 'date-fns';
import { isHoliday } from 'holiday-kr';
import { RiFileList3Line, RiEyeLine, RiAddLine, RiDeleteBinLine, RiInformationLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { getMonthlyWorkApplyWorks, saveWorkApply, updateWorkApply } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import PageHeader from '../components/ui/PageHeader';
import './Main.css';
import Loading from '../components/Loading';

const DAY_LABELS = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토', 0: '일' };
const DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKENDS = ['Sat', 'Sun'];

const BatchApplyBar = ({ onBatch }) => (
  <div className="req-batch-bar d-flex align-items-center gap-1 mb-2 flex-wrap">
    <span className="small text-muted fw-bold me-1" style={{ fontSize: '0.8rem' }}>일괄:</span>
    <Dropdown as={ButtonGroup} size="sm">
      <Dropdown.Toggle variant="outline-secondary" className="req-batch-toggle">
        모두
      </Dropdown.Toggle>
      <Dropdown.Menu className="req-batch-menu">
        <Dropdown.Item onClick={() => onBatch('ALL', 'NORMAL')}>전체 신청 (월~일)</Dropdown.Item>
        <Dropdown.Item onClick={() => onBatch('ALL', 'OPEN')}>전체 오픈 (월~일)</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item onClick={() => onBatch('ALL', 'CLEAR')} className="text-danger">전체 해제</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>

    <Dropdown as={ButtonGroup} size="sm">
      <Dropdown.Toggle variant="outline-secondary" className="req-batch-toggle">
        평일
      </Dropdown.Toggle>
      <Dropdown.Menu className="req-batch-menu">
        <Dropdown.Item onClick={() => onBatch('WEEKDAY', 'NORMAL')}>평일 신청 (월~금)</Dropdown.Item>
        <Dropdown.Item onClick={() => onBatch('WEEKDAY', 'OPEN')}>평일 오픈 (월~금)</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item onClick={() => onBatch('WEEKDAY', 'CLEAR')} className="text-danger">평일 해제</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>

    <Dropdown as={ButtonGroup} size="sm">
      <Dropdown.Toggle variant="outline-secondary" className="req-batch-toggle">
        주말
      </Dropdown.Toggle>
      <Dropdown.Menu className="req-batch-menu">
        <Dropdown.Item onClick={() => onBatch('WEEKEND', 'NORMAL')}>주말 신청 (토·일)</Dropdown.Item>
        <Dropdown.Item onClick={() => onBatch('WEEKEND', 'OPEN')}>주말 오픈 (토·일)</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item onClick={() => onBatch('WEEKEND', 'CLEAR')} className="text-danger">주말 해제</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>

    <button
      type="button"
      className="btn btn-sm btn-outline-danger ms-auto req-batch-reset-btn"
      onClick={() => onBatch('ALL', 'CLEAR')}
      title="모든 요일 선택 해제"
    >
      초기화
    </button>
  </div>
);

const PlaceChipSelect = ({ workPlaces, value, onChange }) => (
  <div className="req-place-chip-wrapper">
    <select
      className="req-place-select-chip"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      aria-label="근무지 선택"
    >
      {workPlaces.length === 0 && <option value="">지점 불러오는 중…</option>}
      {workPlaces.map(wp => (
        <option key={wp.wpIdx} value={wp.wpIdx}>{wp.wpName}</option>
      ))}
    </select>
  </div>
);

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

const ApplyWeekList = ({ monday, block, onToggleType }) => {
  if (!block) return null;
  return (
    <div className="req-vertical-list d-flex flex-column gap-2 mb-3">
      {DAYS_ORDER.map((day, i) => {
        const date = addDays(monday, i);
        const dayNum = getDay(date);
        const isHoly = isHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate()) || dayNum === 0;
        const isSat = dayNum === 6 && !isHoly;
        const applied = block.days[day];
        const isOpen = applied && block.openShift[day];
        const isNormal = applied && !isOpen;

        return (
          <div
            key={day}
            className={`req-vertical-row d-flex align-items-center justify-content-between ${
              isOpen ? 'row-open' : isNormal ? 'row-normal' : ''
            }`}
          >
            <div className="req-row-date d-flex align-items-center gap-2">
              <span className={`req-row-day-name fw-bolder ${isHoly ? 'text-danger' : isSat ? 'text-primary' : ''}`}>
                {DAY_LABELS[dayNum]}
              </span>
              <span className="req-row-day-number fw-bold text-muted">
                {format(date, 'd')}
              </span>
            </div>

            <div className="req-row-btn-group d-flex align-items-center gap-2">
              <button
                type="button"
                className={`req-action-btn ${isNormal ? 'active-normal' : ''}`}
                onClick={() => onToggleType(day, 'NORMAL')}
                aria-label={`${DAY_LABELS[dayNum]}요일 ${format(date, 'd')}일 일반 신청`}
              >
                신청
              </button>
              <button
                type="button"
                className={`req-action-btn ${isOpen ? 'active-open' : ''}`}
                onClick={() => onToggleType(day, 'OPEN')}
                aria-label={`${DAY_LABELS[dayNum]}요일 ${format(date, 'd')}일 오픈 신청`}
              >
                오픈
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ApplyWeekGrid = ({ monday, block, onToggleType }) => (
  <ApplyWeekList monday={monday} block={block} onToggleType={onToggleType} />
);

const isPublicAssignment = (s) =>
  (s?.wsdStatus === '출근' || s?.wsdStatus === '배정' || s?.wsdStatus === '타지점근무') && s?.wsdIsConfirmed === true;

/** 빈 칸 (null / 레거시 미신청) — 신청 이력 없음 */
const isBlankStatus = (status) => !status || status === '미신청';

/** 알바생 비공개 (확정 미출근 등) — 이력에는 남기되 상태/시간 비공개 */
const isWorkerHiddenStatus = (status) => status === '미배정';

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
  if (s?.wsdStatus === '미출근' || s?.wsdStatus === '미배정') return '미배정';
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

  const [showHelpInfo, setShowHelpInfo] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const [selectedCellDetail, setSelectedCellDetail] = useState(null);

  const { totalAppliedDays, totalOpenDays } = useMemo(() => {
    let normalCount = 0;
    let openCount = 0;
    requestBlocks.forEach(b => {
      DAYS_ORDER.forEach(day => {
        if (b.days[day]) {
          if (b.openShift[day]) {
            openCount++;
          } else {
            normalCount++;
          }
        }
      });
    });
    return {
      totalAppliedDays: normalCount + openCount,
      totalOpenDays: openCount
    };
  }, [requestBlocks]);

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
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      
      const prev = subMonths(new Date(y, m - 1), 1);
      const next = addMonths(new Date(y, m - 1), 1);

      const [resPrev, resCurr, resNext] = await Promise.all([
        getMonthlyWorkApplyWorks(prev.getFullYear(), prev.getMonth() + 1),
        getMonthlyWorkApplyWorks(y, m),
        getMonthlyWorkApplyWorks(next.getFullYear(), next.getMonth() + 1)
      ]);

      let allData = [];
      if (resPrev.success) allData = [...allData, ...(resPrev.data || [])];
      if (resCurr.success) allData = [...allData, ...(resCurr.data || [])];
      if (resNext.success) allData = [...allData, ...(resNext.data || [])];

      const uniqueData = Array.from(new Map(allData.map(item => [`${item.date}_${item.wsdIdx || item.applyWorkPlaceIdx || Math.random()}`, item])).values());
      setRequestList(uniqueData);
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

  const handleToggleBlockDayType = (blockId, day, type) => {
    setRequestBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const applied = b.days[day];
      const isOpen = b.openShift[day];
      if (type === 'NORMAL') {
        const nextApplied = !(applied && !isOpen);
        return {
          ...b,
          days: { ...b.days, [day]: nextApplied },
          openShift: { ...b.openShift, [day]: false }
        };
      }
      if (type === 'OPEN') {
        const nextOpen = !(applied && isOpen);
        return {
          ...b,
          days: { ...b.days, [day]: nextOpen },
          openShift: { ...b.openShift, [day]: nextOpen }
        };
      }
      return b;
    }));
  };

  const handleBatchApply = (blockId, scope, type) => {
    const targetDays = scope === 'WEEKDAY' ? WEEKDAYS : scope === 'WEEKEND' ? WEEKENDS : DAYS_ORDER;
    setRequestBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const nextDays = { ...b.days };
      const nextOpen = { ...b.openShift };
      targetDays.forEach(day => {
        if (type === 'CLEAR') {
          nextDays[day] = false;
          nextOpen[day] = false;
        } else if (type === 'OPEN') {
          nextDays[day] = true;
          nextOpen[day] = true;
        } else {
          // NORMAL (신청)
          nextDays[day] = true;
          nextOpen[day] = false;
        }
      });
      return { ...b, days: nextDays, openShift: nextOpen };
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
    
    const targetMonthPrefix = selectedMonth;
    return Object.entries(groups)
      .filter(([monDate, weekSchs]) => {
         for (let i = 0; i < 7; i++) {
           const date = addDays(parseISO(monDate), i);
           if (format(date, 'yyyy-MM') === targetMonthPrefix) return true;
         }
         return false;
      })
      .sort((a, b) => new Date(a[0]) - new Date(b[0]));
  }, [requestList, selectedMonth]);

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
        
        // 새로 신청한 주차의 월(Month)로 드롭다운 자동 변경
        const appliedMonth = format(mondayDateObj, 'yyyy-MM');
        setSelectedMonth(appliedMonth);
        
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
    if (monDate < reqDate || weekSchs.some(isPublicAssignment)) {
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

  const handleToggleEditBlockDayType = (blockId, day, type) => {
    setEditBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const applied = b.days[day];
      const isOpen = b.openShift[day];
      if (type === 'NORMAL') {
        const nextApplied = !(applied && !isOpen);
        return {
          ...b,
          days: { ...b.days, [day]: nextApplied },
          openShift: { ...b.openShift, [day]: false }
        };
      }
      if (type === 'OPEN') {
        const nextOpen = !(applied && isOpen);
        return {
          ...b,
          days: { ...b.days, [day]: nextOpen },
          openShift: { ...b.openShift, [day]: nextOpen }
        };
      }
      return b;
    }));
  };

  const handleEditBatchApply = (blockId, scope, type) => {
    const targetDays = scope === 'WEEKDAY' ? WEEKDAYS : scope === 'WEEKEND' ? WEEKENDS : DAYS_ORDER;
    setEditBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const nextDays = { ...b.days };
      const nextOpen = { ...b.openShift };
      targetDays.forEach(day => {
        if (type === 'CLEAR') {
          nextDays[day] = false;
          nextOpen[day] = false;
        } else if (type === 'OPEN') {
          nextDays[day] = true;
          nextOpen[day] = true;
        } else {
          nextDays[day] = true;
          nextOpen[day] = false;
        }
      });
      return { ...b, days: nextDays, openShift: nextOpen };
    }));
  };

  const handleEditSubmit = async () => {
    if (editTarget?.monDate && editTarget.monDate < reqDate) {
      return;
    }
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
    <Container className="py-4 py-md-5 mb-5 req-container">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <h2 className="page-title mb-0">근무 신청</h2>
          <button
            type="button"
            className="req-info-toggle-btn text-muted"
            onClick={() => setShowHelpInfo(prev => !prev)}
            aria-label="근무 신청 안내 문구 보기"
            title="근무 신청 안내"
          >
            <RiInformationLine size={22} />
          </button>
        </div>
      </div>

      {showHelpInfo && (
        <Alert variant="info" dismissible onClose={() => setShowHelpInfo(false)} className="py-2 px-3 small mb-3">
          각 요일의 [신청] 또는 [오픈] 버튼을 탭하여 간편하게 근무를 신청하세요. (선택된 버튼을 다시 누르면 취소됩니다)
        </Alert>
      )}

      <Card className="req-apply-card mb-4">
        <Card.Body className="p-0 p-md-4">
          <Form onSubmit={handleSubmit}>
            {/* 신청 주와 근무지 선택 한 줄 배치 */}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
              <div className="req-apply-week-label">
                신청 주: <span style={{ color: 'var(--color-primary)' }}>{weekRangeLabel}</span>
              </div>
              <PlaceChipSelect
                workPlaces={workPlaces}
                value={requestBlocks[0]?.workPlaceIdx}
                onChange={(wpIdx) => updateBlock(requestBlocks[0]?.id, 'workPlaceIdx', wpIdx)}
              />
            </div>

            {requestBlocks.map((block, idx) => (
              <div key={block.id} className="req-apply-block mb-3">
                {requestBlocks.length > 1 && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small fw-bold text-muted">지점 #{idx + 1}</span>
                    <Button
                      type="button"
                      variant="link"
                      className="text-danger p-0 fw-bold small text-decoration-none"
                      onClick={() => handleRemoveBlock(block.id)}
                    >
                      <RiDeleteBinLine size={18} className="me-1" /> 삭제
                    </Button>
                  </div>
                )}

                {requestBlocks.length > 1 && (
                  <PlaceSelect
                    workPlaces={workPlaces}
                    value={block.workPlaceIdx}
                    onChange={(wpIdx) => updateBlock(block.id, 'workPlaceIdx', wpIdx)}
                  />
                )}

                <BatchApplyBar
                  onBatch={(scope, type) => handleBatchApply(block.id, scope, type)}
                />

                <ApplyWeekList
                  monday={nextMonday}
                  block={block}
                  onToggleType={(day, type) => handleToggleBlockDayType(block.id, day, type)}
                />
              </div>
            ))}

            {/* 비고 입력 필드 바로 노출 */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">비고</Form.Label>
              <Form.Control
                type="text"
                value={globalRemarks}
                onChange={(e) => setGlobalRemarks(e.target.value)}
                className="custom-input"
                placeholder="해당 주간에 전달할 메모"
              />
            </Form.Group>

            {/* 타 지점 추가 신청하기 접이식 버튼 */}
            <Button
              type="button"
              variant="outline-secondary"
              className="w-100 mb-3 py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
              onClick={handleAddBlock}
            >
              <RiAddLine size={20} /> 타 지점 추가 신청하기
            </Button>

            {nextWeekAlreadyApplied && (
              <Alert variant="warning" className="py-2 small fw-bold mb-3">
                이미 신청한 주입니다. 신규 제출 대신 아래 내역의 「수정」을 이용해 주세요.
              </Alert>
            )}

            {/* 하단 탭바 위 고정 제출 바 */}
            <div className="req-sticky-submit-bar">
              <div className="req-submit-summary text-center mb-1">
                <span className="req-sum-normal fw-bold">신청 {totalAppliedDays}일</span>
                <span className="mx-1 text-muted">·</span>
                <span className="req-sum-open fw-bold">오픈 {totalOpenDays}일</span>
              </div>
              <Button
                disabled={loading || nextWeekAlreadyApplied}
                type="submit"
                className="w-100 py-3 fw-bold fs-6 btn-primary req-submit-btn"
              >
                {loading ? '신청 중...' : nextWeekAlreadyApplied ? '이미 신청한 주' : '근무 신청서 제출하기'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-2 fw-bold fs-5" style={{ color: 'var(--color-text-main)' }}>
          <RiFileList3Line style={{ color: 'var(--color-primary)' }} /> 내 신청 내역
        </div>
        <Form.Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="custom-month-select fw-bold w-auto" aria-label="조회 월 선택">
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
              const pendingDaysCount = new Set(
                weekSchs
                  .filter(s => s.wsdStatus === '신청' && !isPublicAssignment(s))
                  .map(s => toDateStr(s.date))
              ).size;
              const isWeekPartial = assignedDaysCount > 0 && pendingDaysCount > 0;
              const isWeekConfirmed = assignedDaysCount > 0 && pendingDaysCount === 0;

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
                        <div className="req-history-meta mt-1">
                          신청 {uniqueApplyDates.size}일
                          {isWeekPartial
                            ? ` · 임시 배정 (출근 ${assignedDaysCount}일 · 대기 ${pendingDaysCount}일)`
                            : isWeekConfirmed
                            ? ` · 출근 ${assignedDaysCount}일`
                            : ' · 출근 대기'}
                        </div>
                      </div>
                      <div className="d-flex gap-2 flex-shrink-0">
                        <Button variant="light" className="req-icon-btn p-2" onClick={() => setViewingRequest({ monDate, weekSchs })} aria-label="상세보기">
                          <RiEyeLine size={20} />
                        </Button>
                        {!weekSchs.some(isPublicAssignment) && monDate >= reqDate && (
                          <Button variant="outline-warning" size="sm" className="fw-bold px-3" onClick={() => handleOpenEdit(monDate, weekSchs)}>
                            수정
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 한 주 7칸 압축 표 */}
                    <div className="req-compact-table-container">
                      <div className="req-compact-grid">
                        {/* 헤더 행 (Corner + 월~일 7칸) */}
                        <div className="req-grid-cell req-grid-corner" />
                        {weekCells.map(({ date, dateStr }) => {
                          const dayNum = getDay(date);
                          const isHoly = isHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate()) || dayNum === 0;
                          const isSat = dayNum === 6 && !isHoly;
                          return (
                            <div key={`h-${dateStr}`} className="req-grid-cell req-grid-header">
                              <div className={`req-grid-day-name ${isHoly ? 'text-danger' : isSat ? 'text-primary' : ''}`}>
                                {DAY_LABELS[dayNum]}
                              </div>
                              <div className="req-grid-day-date">{format(date, 'd')}</div>
                            </div>
                          );
                        })}

                        {/* 1행: 신청 */}
                        <div className="req-grid-cell req-grid-label">신청</div>
                        {weekCells.map(({ date, dateStr, slots }) => {
                          const appliedSlot = slots.find(s => {
                            const selfApplied = s.isSelfApplied ?? s.selfApplied;
                            return selfApplied ?? (s.applyWorkPlaceIdx != null || s.openApplied != null);
                          });
                          const isOpen = appliedSlot && (appliedSlot.openApplied === true || appliedSlot.isOpen === true);
                          const isApplied = !!appliedSlot;
                          const chipClass = isApplied ? (isOpen ? 'cell-open' : 'cell-applied') : 'cell-unapplied';
                          const text = isApplied ? (isOpen ? '오픈' : '신청') : '–';

                          return (
                            <button
                              key={`app-${dateStr}`}
                              type="button"
                              className={`req-grid-cell req-data-cell ${chipClass}`}
                              onClick={() => setSelectedCellDetail({
                                date,
                                type: 'APPLY',
                                slot: appliedSlot,
                                label: isApplied ? (isOpen ? '오픈 근무 신청' : '일반 근무 신청') : '신청 내역 없음'
                              })}
                              aria-label={`${format(date, 'M월 d일')} 신청 내역: ${text}`}
                            >
                              {text}
                            </button>
                          );
                        })}

                        {/* 2행: 배정 */}
                        <div className="req-grid-cell req-grid-label">배정</div>
                        {weekCells.map(({ date, dateStr, slots }) => {
                          const assignedSlot = slots.find(s => isPublicAssignment(s));
                          const didApply = slots.some(s => {
                            const selfApplied = s.isSelfApplied ?? s.selfApplied;
                            return selfApplied ?? (s.applyWorkPlaceIdx != null || s.openApplied != null);
                          });
                          const hasPendingSlot = slots.some(s => s.wsdStatus === '신청');
                          const hasOffSlot = slots.some(s => s.wsdStatus === '미출근' || s.wsdStatus === '미배정');
                          const isRejected = !assignedSlot && (hasOffSlot || (isWeekConfirmed && didApply && !hasPendingSlot));
                          const isPending = !assignedSlot && !isRejected && (hasPendingSlot || slots.some(s => s.wsdIsConfirmed !== true));

                          let text = '–';
                          let chipClass = 'cell-unapplied';
                          let detailLabel = '배정 내역 없음';

                          if (assignedSlot) {
                            text = displayOpenTime(assignedSlot, date).split(' ')[0] || '출근';
                            chipClass = 'cell-work';
                            detailLabel = `${displayOpenTime(assignedSlot, date)} (${assignedSlot.wsdWorkPlaceName || '소속지점'})`;
                          } else if (isPending && didApply) {
                            text = '대기';
                            chipClass = 'cell-pending';
                            detailLabel = '배정 대기 중 (관리자 승인 대기)';
                          } else if (isRejected) {
                            text = '미배정';
                            chipClass = 'cell-rejected';
                            detailLabel = '미배정 (근무 미배정 처리됨)';
                          }

                          return (
                            <button
                              key={`assign-${dateStr}`}
                              type="button"
                              className={`req-grid-cell req-data-cell ${chipClass}`}
                              onClick={() => setSelectedCellDetail({
                                date,
                                type: 'ASSIGN',
                                slot: assignedSlot || slots[0],
                                label: detailLabel
                              })}
                              aria-label={`${format(date, 'M월 d일')} 배정 결과: ${text}`}
                            >
                              {text}
                            </button>
                          );
                        })}
                      </div>

                      {/* 표 하단 색상 범례 */}
                      <div className="req-table-legend d-flex align-items-center justify-content-center gap-3 mt-2 flex-wrap">
                        <span className="req-legend-item"><span className="legend-dot dot-pending" /> 신청/대기</span>
                        <span className="req-legend-item"><span className="legend-dot dot-work" /> 배정 완료</span>
                        <span className="req-legend-item"><span className="legend-dot dot-rejected" /> 미배정</span>
                        <span className="req-legend-item"><span className="legend-dot dot-unapplied">–</span> 미신청</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 칸 탭 상세 안내 모달 */}
      <Modal show={!!selectedCellDetail} onHide={() => setSelectedCellDetail(null)} centered size="sm">
        <Modal.Header closeButton className="py-2">
          <Modal.Title className="fs-6 fw-bold">
            {selectedCellDetail && `${format(selectedCellDetail.date, 'M월 d일')} (${DAY_LABELS[getDay(selectedCellDetail.date)]}) 상세`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3 text-center">
          <div className="fs-5 fw-bold mb-1" style={{ color: 'var(--color-primary)' }}>
            {selectedCellDetail?.label}
          </div>
          {selectedCellDetail?.slot?.wsdWorkPlaceName && (
            <div className="text-muted small mt-1">
              근무 지점: {selectedCellDetail.slot.wsdWorkPlaceName}
            </div>
          )}
          {selectedCellDetail?.slot?.applyWorkPlaceName && (
            <div className="text-muted small mt-1">
              신청 지점: {selectedCellDetail.slot.applyWorkPlaceName}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="py-1 justify-content-center border-0">
          <Button variant="secondary" size="sm" onClick={() => setSelectedCellDetail(null)}>
            닫기
          </Button>
        </Modal.Footer>
      </Modal>

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

              <BatchApplyBar
                onBatch={(scope, type) => handleEditBatchApply(block.id, scope, type)}
              />

              {editTarget && (
                <ApplyWeekGrid
                  monday={parseISO(editTarget.monDate)}
                  block={block}
                  onToggleType={(day, type) => handleToggleEditBlockDayType(block.id, day, type)}
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
                    <td><span className={`req-status-badge ${isPublicAssignment(s) ? 'work' : s.wsdStatus === '신청' ? 'applied' : (s.wsdStatus === '미출근' || s.wsdStatus === '미배정') ? 'rejected' : 'muted'}`}>{displayStatusLabel(s)}</span></td>
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
