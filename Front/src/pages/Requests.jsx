import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { format, startOfWeek, addDays, subMonths, addMonths, parseISO } from 'date-fns';
import { RiFileList3Line, RiAddLine, RiDeleteBinLine, RiInformationLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { getMonthlyWorkApplyWorks, saveWorkApply, updateWorkApply } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import PageHeader from '../components/ui/PageHeader';
import Loading from '../components/Loading';

import {
  DAYS_ORDER,
  WEEKDAYS,
  WEEKENDS,
  isBlankStatus,
  toDateStr,
  isPublicAssignment,
  isUserAppliedShift
} from '../components/requests/requestsUtils';
import {
  BatchApplyBar,
  PlaceChipSelect,
  ApplyWeekGrid
} from '../components/requests/ApplyWeekMatrix';
import RequestHistoryCard from '../components/requests/RequestHistoryCard';
import {
  CellDetailModal,
  EditTargetModal,
  ViewingRequestModal
} from '../components/requests/RequestModals';

import './Main.css';

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
  const [nextWeekSchs, setNextWeekSchs] = useState([]);
  const [submissionStatus, setSubmissionStatus] = useState('');

  const [showHelpInfo, setShowHelpInfo] = useState(false);
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
      setNextWeekSchs([]);
      return;
    }
    const mon = format(nextMonday, 'yyyy-MM-dd');
    const list = res.data || [];
    const nextWeekList = list.filter(sch => {
      if (isBlankStatus(sch.wsdStatus)) return false;
      const d = parseISO(toDateStr(sch.date) || sch.date);
      return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd') === mon;
    });

    const isApplied = nextWeekList.some(isUserAppliedShift);
    setNextWeekAlreadyApplied(isApplied);
    setNextWeekSchs(nextWeekList);

    if (isApplied) {
      setSubmissionStatus(prev => prev === '수정되었습니다.' ? '수정되었습니다.' : '신청되었습니다.');
      const branchGroups = {};
      nextWeekList.forEach(s => {
        if (!isUserAppliedShift(s)) return;
        const wpIdx = s.applyWorkPlaceIdx || s.wsdWorkPlaceIdx || user?.workPlaceIdx;
        if (!branchGroups[wpIdx]) {
          branchGroups[wpIdx] = {
            id: Date.now() + Math.random(),
            workPlaceIdx: wpIdx,
            days: { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false },
            openShift: { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false },
            remarks: s.wsdRemarks || ''
          };
        }
        const dayOfWeek = parseISO(toDateStr(s.date) || s.date).getDay();
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
      setRequestBlocks(blocks.length > 0 ? blocks : [defaultBlock(Date.now())]);
      const existingRemark = nextWeekList.find(s => s.wsdRemarks || s.remarks)?.wsdRemarks || nextWeekList.find(s => s.wsdRemarks || s.remarks)?.remarks || '';
      setGlobalRemarks(existingRemark);
    } else {
      setSubmissionStatus('');
      setRequestBlocks([defaultBlock(Date.now())]);
    }
  };

  const nextWeekSchsFromList = useMemo(() => {
    return requestList.filter(sch => {
      if (isBlankStatus(sch.wsdStatus)) return false;
      const d = parseISO(toDateStr(sch.date) || sch.date);
      return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd') === reqDate;
    });
  }, [requestList, reqDate]);

  const effectiveNextWeekSchs = nextWeekSchsFromList.length > 0 ? nextWeekSchsFromList : nextWeekSchs;

  const nextWeekSummary = useMemo(() => {
    const validSchs = effectiveNextWeekSchs.filter(s => !isBlankStatus(s.wsdStatus) && isUserAppliedShift(s));
    const uniqueDates = new Set(validSchs.map(s => toDateStr(s.date) || s.date));
    let openCount = 0;
    validSchs.forEach(s => {
      if (s.wsdStartTime === '오픈' || s.isOpen === true || s.openApplied === true || s.wsdIsOpen === true) {
        openCount++;
      }
    });
    return {
      appliedCount: uniqueDates.size,
      openCount
    };
  }, [effectiveNextWeekSchs]);

  const nextWeekIsConfirmed = useMemo(() => {
    return effectiveNextWeekSchs.some(isPublicAssignment);
  }, [effectiveNextWeekSchs]);

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
      .filter(([monDate]) => {
        if (monDate === reqDate) return false;
        for (let i = 0; i < 7; i++) {
          const date = addDays(parseISO(monDate), i);
          if (format(date, 'yyyy-MM') === targetMonthPrefix) return true;
        }
        return false;
      })
      .sort((a, b) => new Date(a[0]) - new Date(b[0]));
  }, [requestList, selectedMonth, reqDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nextWeekIsConfirmed) {
      alert('이미 배정이 확정되어 수정할 수 없습니다.');
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
      const res = nextWeekAlreadyApplied
        ? await updateWorkApply(startDateStr, endDateStr, requestData)
        : await saveWorkApply(startDateStr, endDateStr, requestData);

      setLoading(false);
      if (res.success) {
        setSubmissionStatus(nextWeekAlreadyApplied ? '수정되었습니다.' : '신청되었습니다.');
        const appliedMonth = format(mondayDateObj, 'yyyy-MM');
        setSelectedMonth(appliedMonth);
        refreshNextWeekApplied();
        loadRequests(appliedMonth);
      } else {
        alert(res.error || (nextWeekAlreadyApplied ? '근무 신청 수정에 실패했습니다.' : '근무 신청에 실패했습니다.'));
      }
    } catch {
      setLoading(false);
      alert(nextWeekAlreadyApplied ? '근무 신청 수정 중 오류가 발생했습니다.' : '근무 신청 중 오류가 발생했습니다.');
    }
  };

  const handleOpenEdit = (monDate, weekSchs) => {
    if (monDate < reqDate || weekSchs.some(isPublicAssignment)) {
      return;
    }

    const branchGroups = {};
    weekSchs.forEach(s => {
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
      const dayOfWeek = parseISO(s.date).getDay();
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
        alert('신청 내용이 수정되었습니다.');
        setEditTarget(null);
        loadRequests(selectedMonth);
        refreshNextWeekApplied();
      } else {
        alert(res.error || '수정에 실패했습니다.');
      }
    } catch {
      setEditLoading(false);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  return (
    <Container className="py-2 py-md-4 req-container">
      <PageHeader
        title="다음 주 근무 신청"
        description="다음 주에 일하고 싶은 요일을 선택해 신청하세요."
      >
        <Button
          variant="outline-secondary"
          size="sm"
          className="rounded-pill px-3 d-inline-flex align-items-center gap-1"
          onClick={() => setShowHelpInfo(prev => !prev)}
          aria-expanded={showHelpInfo}
        >
          <RiInformationLine size={16} /> 신청 방법
        </Button>
      </PageHeader>

      {showHelpInfo && (
        <Alert
          variant="info"
          dismissible
          onClose={() => setShowHelpInfo(false)}
          className="req-guide-alert mb-3"
        >
          <div className="fw-bold mb-1">근무 신청 안내</div>
          <ul className="mb-0 small ps-3">
            <li><strong>신청 버튼:</strong> 원하는 요일의 [신청] 버튼을 누르면 일반 근무로 신청됩니다.</li>
            <li><strong>오픈 버튼:</strong> 오픈 조(평일 16:00, 주말/공휴일 10:00 출근)를 희망하면 [오픈] 버튼을 누르세요.</li>
            <li><strong>일괄 메뉴:</strong> 평일/주말/전체 버튼으로 한 번에 신청하거나 초기화할 수 있습니다.</li>
            <li><strong>타 지점 추가:</strong> 여러 매장에서 교차 근무를 희망하면 [+ 타 지점 추가 신청하기]를 이용하세요.</li>
            <li><strong>신청 기한:</strong> 마감 전까지 아래 [내 신청 내역]에서 자유롭게 수정할 수 있습니다.</li>
          </ul>
        </Alert>
      )}

      <Card className="req-card mb-4">
        <Card.Body className="p-3 p-md-4">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-3 flex-wrap">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="req-apply-badge">신청 대상</span>
              <span className="req-apply-week-title">{weekRangeLabel}</span>
            </div>
            <div className="req-apply-stats d-flex align-items-center gap-2 small">
              <span className="text-muted">
                선택됨: <strong className="text-primary">{totalAppliedDays}일</strong>
                {totalOpenDays > 0 && <span className="ms-1">(오픈 {totalOpenDays}일)</span>}
              </span>
            </div>
          </div>

          <Form onSubmit={handleSubmit}>
            {requestBlocks.map((block) => {
              const currentWp = workPlaces.find(w => String(w.wpIdx) === String(block.workPlaceIdx));

              return (
                <div key={block.id} className="req-apply-block mb-3">
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <PlaceChipSelect
                        workPlaces={workPlaces}
                        value={block.workPlaceIdx}
                        onChange={(wpIdx) => setRequestBlocks(prev => prev.map(b => b.id === block.id ? { ...b, workPlaceIdx: wpIdx } : b))}
                      />
                      {submissionStatus && (requestBlocks.length === 1 || Object.values(block.days).some(Boolean)) && (
                        <span className="req-submit-status-badge">
                          {submissionStatus}
                        </span>
                      )}
                    </div>
                    {requestBlocks.length > 1 && (
                      <Button
                        variant="link"
                        className="text-danger p-0 ms-auto req-remove-block-btn"
                        onClick={() => handleRemoveBlock(block.id)}
                        aria-label={`${currentWp?.wpName || '지점'} 신청 블록 삭제`}
                      >
                        <RiDeleteBinLine size={18} />
                      </Button>
                    )}
                  </div>

                  <BatchApplyBar
                    onBatch={(scope, type) => handleBatchApply(block.id, scope, type)}
                  />

                  <ApplyWeekGrid
                    monday={nextMonday}
                    block={block}
                    onToggleType={(day, type) => handleToggleBlockDayType(block.id, day, type)}
                    weekSchs={effectiveNextWeekSchs.filter(s => !block.workPlaceIdx || String(s.applyWorkPlaceIdx || s.wsdWorkPlaceIdx) === String(block.workPlaceIdx))}
                    onCellDetailClick={setSelectedCellDetail}
                    disabled={nextWeekIsConfirmed}
                  />
                </div>
              );
            })}

            <Button
              variant="outline-secondary"
              className="w-100 py-2 mb-3 fw-bold d-flex align-items-center justify-content-center gap-2 req-add-block-btn"
              onClick={handleAddBlock}
              type="button"
              disabled={nextWeekIsConfirmed}
            >
              <RiAddLine size={18} /> 타 지점 추가 신청하기
            </Button>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small mb-1">비고 (선택)</Form.Label>
              <Form.Control
                type="text"
                placeholder="전달할 메모가 있다면 작성해주세요"
                value={globalRemarks}
                onChange={(e) => setGlobalRemarks(e.target.value)}
                className="custom-input"
                disabled={nextWeekIsConfirmed}
              />
            </Form.Group>

            <div className="req-sticky-submit-bar">
              <div className="req-submit-summary text-center mb-1">
                <span className="req-sum-normal fw-bold">선택 {totalAppliedDays}일</span>
                {totalOpenDays > 0 && (
                  <>
                    <span className="mx-1 text-muted">·</span>
                    <span className="req-sum-open fw-bold">오픈 {totalOpenDays}일</span>
                  </>
                )}
              </div>
              <Button
                disabled={loading || totalAppliedDays === 0 || nextWeekIsConfirmed}
                type="submit"
                className="w-100 py-3 fw-bold fs-6 btn-primary req-submit-btn"
              >
                {loading
                  ? (nextWeekAlreadyApplied ? '수정 중...' : '신청 중...')
                  : nextWeekIsConfirmed
                    ? '배정 확정됨 (수정 불가)'
                    : nextWeekAlreadyApplied
                      ? '근무 수정하기'
                      : '근무 신청하기'}
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
            weeklyGroups.map(([monDate, weekSchs]) => (
              <RequestHistoryCard
                key={monDate}
                monDate={monDate}
                weekSchs={weekSchs}
                reqDate={reqDate}
                setViewingRequest={setViewingRequest}
                handleOpenEdit={handleOpenEdit}
                setSelectedCellDetail={setSelectedCellDetail}
              />
            ))
          )}
        </div>
      )}

      <CellDetailModal
        selectedCellDetail={selectedCellDetail}
        onHide={() => setSelectedCellDetail(null)}
      />

      <EditTargetModal
        editTarget={editTarget}
        onHide={() => setEditTarget(null)}
        editBlocks={editBlocks}
        setEditBlocks={setEditBlocks}
        workPlaces={workPlaces}
        handleEditBatchApply={handleEditBatchApply}
        handleToggleEditBlockDayType={handleToggleEditBlockDayType}
        defaultBlock={defaultBlock}
        editGlobalRemarks={editGlobalRemarks}
        setEditGlobalRemarks={setEditGlobalRemarks}
        handleEditSubmit={handleEditSubmit}
        editLoading={editLoading}
      />

      <ViewingRequestModal
        viewingRequest={viewingRequest}
        onHide={() => setViewingRequest(null)}
      />
    </Container>
  );
};

export default Requests;
