import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { RiAddLine, RiDeleteBinLine, RiInformationLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { getMonthlyWorkApplyWorks, saveWorkApply, updateWorkApply } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import PageHeader from '../components/ui/PageHeader';

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
import { CellDetailModal } from '../components/requests/RequestModals';

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
  const [loading, setLoading] = useState(false);

  const [globalRemarks, setGlobalRemarks] = useState('');
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

  const effectiveNextWeekSchs = nextWeekSchs;

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

  const isBlockApplied = useMemo(() => {
    return (blockWpIdx) => {
      return nextWeekSchs.some(s => {
        const wpIdx = s.applyWorkPlaceIdx || s.wsdWorkPlaceIdx || user?.workPlaceIdx;
        return String(wpIdx) === String(blockWpIdx) && isUserAppliedShift(s);
      });
    };
  }, [nextWeekSchs, user?.workPlaceIdx]);

  useEffect(() => {
    fetchWorkPlaces(true).then(res => {
      if (res.success) setWorkPlaces(res.data);
    });
    refreshNextWeekApplied();
  }, []);

  const handleAddBlock = () => {
    if (workPlaces.length > 0 && requestBlocks.length >= workPlaces.length) {
      alert('더 이상 추가할 수 있는 근무지가 없습니다.');
      return;
    }
    const usedWpIdxs = requestBlocks.map(b => String(b.workPlaceIdx));
    const candidate = workPlaces.find(w => !usedWpIdxs.includes(String(w.wpIdx)) && String(w.wpIdx) !== String(user?.workPlaceIdx))
      || workPlaces.find(w => !usedWpIdxs.includes(String(w.wpIdx)))
      || workPlaces.find(w => String(w.wpIdx) !== String(user?.workPlaceIdx))
      || workPlaces[0];
    const targetWpIdx = candidate ? candidate.wpIdx : (user?.workPlaceIdx || '');

    setRequestBlocks(prev => [...prev, {
      ...defaultBlock(Date.now()),
      workPlaceIdx: targetWpIdx
    }]);
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
        refreshNextWeekApplied();
      } else {
        alert(res.error || (nextWeekAlreadyApplied ? '근무 신청 수정에 실패했습니다.' : '근무 신청에 실패했습니다.'));
      }
    } catch {
      setLoading(false);
      alert(nextWeekAlreadyApplied ? '근무 신청 수정 중 오류가 발생했습니다.' : '근무 신청 중 오류가 발생했습니다.');
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
            <li><strong>신청 수정:</strong> 마감 전까지 상단 신청 매트릭스에서 언제든 수정하고 다시 제출할 수 있습니다.</li>
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
                  <div className="d-flex justify-content-between align-items-center mb-2 gap-2">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <PlaceChipSelect
                        value={block.workPlaceIdx}
                        workPlaces={workPlaces}
                        options={workPlaces}
                        onChange={(valOrEvent) => {
                          const val = typeof valOrEvent === 'object' && valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
                          setRequestBlocks(prev => prev.map(b => b.id === block.id ? { ...b, workPlaceIdx: val } : b));
                        }}
                        homeWorkPlaceIdx={user?.workPlaceIdx}
                      />
                      {submissionStatus && isBlockApplied(block.workPlaceIdx) && (
                        <span className="badge bg-success-subtle text-success border border-success-subtle fw-semibold px-2 py-1">
                          {submissionStatus}
                        </span>
                      )}
                    </div>

                    {requestBlocks.length > 1 && (
                      <button
                        type="button"
                        className="req-remove-block-btn"
                        onClick={() => handleRemoveBlock(block.id)}
                        title="이 지점 신청 삭제"
                        aria-label="이 지점 신청 삭제"
                      >
                        <RiDeleteBinLine size={16} />
                      </button>
                    )}
                  </div>

                  <BatchApplyBar onBatch={(scope, type) => handleBatchApply(block.id, scope, type)} />

                  <ApplyWeekGrid
                    block={block}
                    monday={nextMonday}
                    nextMonday={nextMonday}
                    weekSchs={nextWeekSchs}
                    disabled={nextWeekIsConfirmed}
                    onToggleType={(day, type) => handleToggleBlockDayType(block.id, day, type)}
                    onCellDetailClick={setSelectedCellDetail}
                  />
                </div>
              );
            })}

            <div className="mb-3">
              <Button
                variant="outline-primary"
                size="sm"
                className="w-100 py-2 d-flex align-items-center justify-content-center gap-1 req-outline-btn rounded-3 fw-bold"
                onClick={handleAddBlock}
                disabled={nextWeekIsConfirmed}
              >
                <RiAddLine size={18} /> 타 지점 근무 추가 신청하기
              </Button>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-muted">
                관리자에게 전달할 메모 (선택사항)
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="해당 주간에 전달할 메모를 적어주세요."
                value={globalRemarks}
                onChange={(e) => setGlobalRemarks(e.target.value)}
                maxLength={100}
                className="custom-input"
                disabled={nextWeekIsConfirmed}
              />
            </Form.Group>

            <div className="req-sticky-submit-bar">
              <div className="req-submit-summary small mb-2 text-center text-muted">
                선택 <strong className="text-primary">{totalAppliedDays}일</strong>
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

      <CellDetailModal
        selectedCellDetail={selectedCellDetail}
        onHide={() => setSelectedCellDetail(null)}
      />
    </Container>
  );
};

export default Requests;
