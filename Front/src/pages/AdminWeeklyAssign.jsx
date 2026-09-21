import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Container, Table, Button, Spinner, Form, Card, Modal, Badge, ButtonGroup, ToggleButton } from 'react-bootstrap';
import { fetchWorkRequests, saveWorkSchedules } from '../api/workApi';
import { fetchWorkPlaces, fetchAllUsers } from '../api/authApi';
import { addDays, format, startOfWeek, endOfWeek, subWeeks, addWeeks, getWeekOfMonth, parseISO, getYear, getMonth, getDate, isSunday, isSaturday, getDay } from 'date-fns';
import { isHoliday } from 'holiday-kr';
import useAuthStore from '../store/useAuthStore';
import { RiArrowLeftSLine, RiArrowRightSLine, RiDownload2Line, RiUserAddLine, RiDeleteBinLine, RiSearchLine, RiAddLine } from 'react-icons/ri';
import './AdminMain.css';
import Loading from '../components/Loading';

const TIME_OPTIONS = [];
for (let h = 10; h <= 23; h++) {
  const hour = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hour}:00`);
  TIME_OPTIONS.push(`${hour}:30`);
}

const toUserIdx = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
};

const toDateStr = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  if (Array.isArray(value) && value.length >= 3) {
    return `${value[0]}-${String(value[1]).padStart(2, '0')}-${String(value[2]).padStart(2, '0')}`;
  }
  try {
    return format(value, 'yyyy-MM-dd');
  } catch {
    return String(value);
  }
};

const openStartTimeForDate = (dateStr) => {
  const dateObj = parseISO(dateStr);
  const dayOfWeek = getDay(dateObj);
  const isHoli = isHoliday(getYear(dateObj), getMonth(dateObj) + 1, getDate(dateObj));
  return (dayOfWeek === 0 || dayOfWeek === 6 || isHoli) ? '10:00' : '16:00';
};

const createEmptyShift = (userIdx, dateStr, workPlaceIdx, status = '미신청') => ({
  _id: Math.random().toString(36).slice(2, 11),
  userIdx,
  date: dateStr,
  wsdStatus: status,
  wsdStartTime: '',
  wsdWorkPlaceIdx: workPlaceIdx,
  wsdIsConfirmed: false,
  wsdIsOpen: false,
  openApplied: false
});

const displayShiftStatus = (status) => (status === '배정' ? '출근' : (status || '미신청'));

const getShiftTone = (shift) => {
  if (shift.wsdStartTime && (shift.wsdStatus === '배정' || shift.wsdStatus === '타지점근무')) return 'assigned';
  if (shift.wsdStatus === '신청') return 'applied';
  if (shift.wsdStatus === '미배정') return 'unassigned';
  if (shift.wsdStatus === '타지점근무') return 'other-branch';
  return 'unapplied';
};

const canResetShift = (shift) => {
  const status = shift?.wsdStatus;
  return status === '신청' || status === '배정' || status === '타지점근무' || status === '미배정';
};

const hadWorkApply = (shift) => {
  if (!shift) return false;
  if (shift.wsdStatus === '신청') return true;
  if (shift.openApplied === true) return true;
  return shift.applyWorkPlaceIdx != null && shift.applyWorkPlaceIdx !== '';
};

const resetShiftFields = (target) => {
  const applied = hadWorkApply(target);
  const isOpen = applied && !!target.openApplied;
  const dateStr = toDateStr(target.date);
  return {
    ...target,
    wsdStatus: applied ? '신청' : '미신청',
    wsdStartTime: isOpen && dateStr ? openStartTimeForDate(dateStr) : '',
    wsdIsOpen: isOpen,
    wsdIsConfirmed: false
  };
};

const AdminWeeklyAssign = () => {
  const { user } = useAuthStore();
  const tableRef = useRef(null);

  const [isExporting, setIsExporting] = useState(false);
  const [selectedWpIdx, setSelectedWpIdx] = useState(user?.workPlaceIdx || null);
  const [branches, setBranches] = useState([]);

  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [allUsers, setAllUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [filterType, setFilterType] = useState('ALL'); // ALL, APPLIED, NOT_APPLIED, UNASSIGNED

  const [addedWorkerUserIdxs, setAddedWorkerUserIdxs] = useState([]);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [selectedOtherUserIdx, setSelectedOtherUserIdx] = useState('');
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 로컬에서 편집 중인 스케줄 상태 (userIdx -> date -> array of schedules)
  const [editSchedules, setEditSchedules] = useState({});

  const currentBranchObj = useMemo(() => {
    if (branches.length === 0) return null;
    return branches.find(b => Number(b.wpIdx) === Number(selectedWpIdx)) || branches[0];
  }, [branches, selectedWpIdx]);

  const currentWorkPlaceIdx = currentBranchObj?.wpIdx || user?.workPlaceIdx || 1;
  const selectedBranchName = currentBranchObj?.wpName || user?.workPlaceName || user?.branch || '지점';

  const handleDownloadPNG = async () => {
    if (!tableRef.current) return;
    try {
      // 1. 다운로드용 제목을 화면(DOM)에 잠깐 나타나게 설정
      setIsExporting(true);

      // React가 DOM을 그려낼 수 있도록 아주 짧은 대기 시간 부여
      await new Promise((resolve) => setTimeout(resolve, 100));

      const element = tableRef.current;
      const responsiveDiv = element.querySelector('.table-responsive');

      const originalCardOverflow = element.style.overflow;
      const originalDivOverflow = responsiveDiv ? responsiveDiv.style.overflow : '';

      element.style.overflow = 'visible';
      if (responsiveDiv) responsiveDiv.style.overflow = 'visible';

      await new Promise((resolve) => setTimeout(resolve, 150));

      const fullWidth = element.scrollWidth;
      const fullHeight = element.scrollHeight;

      // 2. 캡처 실행 (data-html2canvas-ignore="true" 속성 자동 필터링)
      const surfaceColor = (getComputedStyle(document.documentElement).getPropertyValue('--color-surface') || '#ffffff').trim();

      const dataUrl = await toPng(element, {
        backgroundColor: surfaceColor,
        cacheBust: true,
        width: fullWidth,
        height: fullHeight,
        style: {
          width: `${fullWidth}px`,
          maxWidth: 'none',
        },
        filter: (node) => {
          if (node.dataset && node.dataset.html2canvasIgnore === 'true') {
            return false;
          }
          return true;
        }
      });

      // 3. 캡처가 끝났으므로 다시 제목 숨기기 및 스타일 원복
      setIsExporting(false);
      element.style.overflow = originalCardOverflow;
      if (responsiveDiv) responsiveDiv.style.overflow = originalDivOverflow;

      // 4. 여백 및 다운로드 처리
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const padding = 20;
      const canvas = document.createElement('canvas');
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = surfaceColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding);

      const finalDataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = finalDataUrl;
      link.download = `주간배정_${format(currentWeekStart, 'yyyy-MM-dd')}.png`;
      link.click();
    } catch (err) {
      setIsExporting(false); // 에러가 나도 화면 원복
      if (tableRef.current) {
        tableRef.current.style.overflow = '';
        const responsiveDiv = tableRef.current.querySelector('.table-responsive');
        if (responsiveDiv) responsiveDiv.style.overflow = '';
      }
      console.error(err);
      alert("이미지 저장 중 오류가 발생했습니다.");
    }
  };

  const loadData = async () => {
    setLoading(true);
    const dateStr = format(currentWeekStart, 'yyyy-MM-dd');
    let loadedBranches = branches;
    const [reqRes, branchRes, workerRes] = await Promise.all([
      fetchWorkRequests(dateStr, currentWorkPlaceIdx, true),
      fetchWorkPlaces(),
      fetchAllUsers({ size: 1000, page: 0 })
    ]);

    if (branchRes.success && branchRes.data) {
      loadedBranches = branchRes.data;
      setBranches(branchRes.data);
      if (!selectedWpIdx) {
        const myBranch = branchRes.data.find(b => Number(b.wpIdx) === Number(user?.workPlaceIdx));
        setSelectedWpIdx(myBranch?.wpIdx || branchRes.data[0]?.wpIdx);
      }
    }

    const resolveUserWpIdx = (u) => (
      u.workPlaceIdx || u.branchIdx || u.fkWorkPlaceIdx
        || loadedBranches.find(b => b.wpName === u.workPlaceName)?.wpIdx
        || null
    );

    let workerList = [];
    if (workerRes.success) {
      let list = workerRes.data?.content || (Array.isArray(workerRes.data) ? workerRes.data : []);
      list = list.filter(u => u.userTypeIdx !== 1 && Number(u.is_admin ?? u.isAdmin ?? 0) !== 1);
      workerList = list;
      setAllUsers(list);
    }

    if (reqRes.success) {
      const rawData = reqRes.data || [];
      const rawSchedules = Array.isArray(rawData) ? rawData : (rawData.content || Object.values(rawData).flat() || []);
      setSchedules(rawSchedules);

      const initialEdits = {};
      rawSchedules.forEach(sch => {
        const uid = toUserIdx(sch.userIdx || sch.user?.userIdx || sch.workerIdx || sch.fkUserIdx || sch.wsdUserIdx || sch.user_idx);
        if (uid == null || uid === '') return;

        const dt = toDateStr(sch.date || sch.wsdDate || sch.scheduleDate);
        if (!dt) return;

        if (!initialEdits[uid]) initialEdits[uid] = {};
        if (!initialEdits[uid][dt]) initialEdits[uid][dt] = [];

        const status = sch.wsdStatus || sch.status || '미배정';
        const openApplied = !!sch.openApplied;
        const isOpen = !!sch.wsdIsOpen || (status === '신청' && openApplied);
        const startTime = sch.wsdStartTime || sch.startTime || (isOpen ? openStartTimeForDate(dt) : '');
        initialEdits[uid][dt].push({
          ...sch,
          _id: Math.random().toString(36).slice(2, 11),
          userIdx: uid,
          date: dt,
          wsdStatus: status,
          wsdStartTime: startTime,
          wsdWorkPlaceIdx: sch.wsdWorkPlaceIdx || sch.applyWorkPlaceIdx || sch.workPlaceIdx || sch.fkWorkPlaceIdx || currentWorkPlaceIdx,
          wsdIsConfirmed: !!sch.wsdIsConfirmed,
          openApplied,
          wsdIsOpen: isOpen
        });
      });

      const currentWeekDays = Array.from({ length: 7 }).map((_, i) => format(addDays(currentWeekStart, i), 'yyyy-MM-dd'));
      workerList.forEach(u => {
        const uid = toUserIdx(u.userIdx || u.id);
        const wpIdx = resolveUserWpIdx(u);
        const isHome = Number(wpIdx) === Number(currentWorkPlaceIdx);
        const hasScheduleForHome = initialEdits[uid] && Object.values(initialEdits[uid]).some(daySchs =>
          daySchs.some(s => Number(s.wsdWorkPlaceIdx || s.applyWorkPlaceIdx || wpIdx) === Number(currentWorkPlaceIdx))
        );

        if (isHome || hasScheduleForHome) {
          if (!initialEdits[uid]) initialEdits[uid] = {};
          currentWeekDays.forEach(dt => {
            if (!initialEdits[uid][dt] || initialEdits[uid][dt].length === 0) {
              initialEdits[uid][dt] = [createEmptyShift(uid, dt, currentWorkPlaceIdx, '미신청')];
            }
          });
        }
      });

      setEditSchedules(initialEdits);
    }

    setLoading(false);
  };

  useEffect(() => {
    setAddedWorkerUserIdxs([]);
    loadData();
  }, [currentWeekStart, selectedWpIdx]);

  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const renderUsers = useMemo(() => {
    let usersToShow = allUsers.filter(u => {
      if (u.status === '퇴사' || u.isActive === false || u.userIsActive === 0) return false;
      const uid = toUserIdx(u.userIdx || u.id);
      const wpIdx = u.workPlaceIdx || u.branchIdx || u.fkWorkPlaceIdx || branches.find(b => b.wpName === u.workPlaceName)?.wpIdx;
      const isHome = Number(wpIdx) === Number(currentWorkPlaceIdx);
      const hasScheduleForHome = editSchedules[uid] && Object.values(editSchedules[uid]).some(daySchs =>
          daySchs.some(s => Number(s.wsdWorkPlaceIdx || s.applyWorkPlaceIdx || wpIdx) === Number(currentWorkPlaceIdx))
      );
      const isAdded = addedWorkerUserIdxs.includes(uid) || addedWorkerUserIdxs.includes(u.userIdx);
      return isHome || hasScheduleForHome || isAdded;
    });

    if (filterType !== 'ALL') {
      usersToShow = usersToShow.filter(u => {
        const uid = toUserIdx(u.userIdx || u.id);
        const userSchs = editSchedules[uid] || {};
        const allDaySchs = Object.values(userSchs).flat();

        if (filterType === 'APPLIED') {
          return allDaySchs.some(s => s.openApplied || s.wsdStatus === '신청' || s.status === '신청');
        }
        if (filterType === 'NOT_APPLIED') {
          return allDaySchs.length === 0 || allDaySchs.every(s => s.wsdStatus === '미신청');
        }
        if (filterType === 'UNASSIGNED') {
          return allDaySchs.some(s => s.wsdStatus === '미배정' || s.wsdStatus === '신청');
        }
        return true;
      });
    }

    return usersToShow;
  }, [allUsers, editSchedules, currentWorkPlaceIdx, addedWorkerUserIdxs, filterType, branches]);

  const handleAddShift = (userIdx, dateStr) => {
    const uid = toUserIdx(userIdx);
    setEditSchedules(prev => {
      const nextUser = { ...(prev[uid] || {}) };
      const nextDateArr = [...(nextUser[dateStr] || [])];
      nextDateArr.push(createEmptyShift(uid, dateStr, currentWorkPlaceIdx, nextDateArr.length === 0 ? '미신청' : '미배정'));
      nextUser[dateStr] = nextDateArr;
      return { ...prev, [uid]: nextUser };
    });
  };

  const handleUpdateShift = (userIdx, dateStr, id, patch) => {
    const uid = toUserIdx(userIdx);
    setEditSchedules(prev => {
      const nextUser = { ...(prev[uid] || {}) };
      const arr = [...(nextUser[dateStr] || [])];
      const idx = arr.findIndex(s => s._id === id);
      if (idx === -1) return prev;

      const nextShift = { ...arr[idx], ...patch };
      if (patch.wsdIsOpen === true) {
        nextShift.wsdStartTime = openStartTimeForDate(dateStr);
        nextShift.wsdStatus = '배정';
      }
      arr[idx] = nextShift;
      nextUser[dateStr] = arr;
      return { ...prev, [uid]: nextUser };
    });
  };

  const handleRemoveShift = (userIdx, dateStr, id) => {
    if (!window.confirm("해당 배정 내역을 초기화 하시겠습니까?")) return;
    const uid = toUserIdx(userIdx);
    setEditSchedules(prev => {
      const nextUser = { ...(prev[uid] || {}) };
      const arr = [...(nextUser[dateStr] || [])];
      const target = arr.find(s => s._id === id);
      if (!target) return prev;

      if (arr.length > 1) {
        nextUser[dateStr] = arr.filter(s => s._id !== id);
        return { ...prev, [uid]: nextUser };
      }

      nextUser[dateStr] = [resetShiftFields(target)];
      return { ...prev, [uid]: nextUser };
    });
  };

  const handleSaveAll = async (isConfirm = true) => {
    if (!window.confirm(isConfirm ? "배정을 확정하시겠습니까? (알바생들에게 결과가 공개됩니다)" : "배정을 임시 저장하시겠습니까? (아직 알바생들에게 공개되지 않습니다)")) return;
    setSaving(true);

    const payload = [];
    Object.keys(editSchedules).forEach(uIdx => {
      Object.keys(editSchedules[uIdx]).forEach(dStr => {
        const shifts = editSchedules[uIdx][dStr];
        shifts.forEach(shift => {
          let status = shift.wsdStatus === '신규' ? '배정' : (shift.wsdStatus || '배정');
          const startTimeRaw = shift.wsdStartTime
            || (shift.wsdIsOpen ? openStartTimeForDate(dStr) : '');
          // 오픈 신청은 시간이 미리 채워져 있어도 상태는 '신청'이라, 확정 시 건너뛰면 배정이 안 남는다.
          if (status === '신청' && (shift.wsdIsOpen || startTimeRaw)) {
            status = '배정';
          }
          if (status === '미신청' || status === '신청') return;
          payload.push({
            userIdx: Number(uIdx),
            date: dStr,
            status,
            startTime: startTimeRaw ? (startTimeRaw.match(/(\d{2}:\d{2})/) ? startTimeRaw.match(/(\d{2}:\d{2})/)[1] : startTimeRaw) : '',
            workPlaceIdx: shift.wsdWorkPlaceIdx || currentWorkPlaceIdx,
            isConfirmed: isConfirm && (status === '배정' || status === '타지점근무'),
            isOpen: shift.wsdIsOpen || false
          });
        });
      });
    });

    const startDateStr = format(currentWeekStart, 'yyyy-MM-dd');
    const endDateStr = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const res = await saveWorkSchedules(payload, startDateStr, endDateStr, currentWorkPlaceIdx);
    setSaving(false);
    if (res.success) {
      alert(isConfirm ? "주간 근무 배정이 확정되었습니다." : "임시 저장이 완료되었습니다.");
      loadData();
    } else {
      alert(res.error || "저장에 실패했습니다.");
    }
  };

  return (
      <div className="admin-container bg-light min-vh-100 pb-5">
        <Container fluid className="px-4 py-4">
          {/* 헤더 및 컨트롤 패널 */}
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <h4 className="fw-bold mb-3">주간 스케줄 배정</h4>
              <div className="d-flex align-items-center gap-3">
                {branches.length > 0 && (
                    <Form.Select
                        className="fw-bold bg-white shadow-sm border-0"
                        style={{ width: 'auto', minWidth: '140px', padding: '10px 36px 10px 16px', borderRadius: '12px' }}
                        value={selectedWpIdx || ''}
                        onChange={(e) => setSelectedWpIdx(e.target.value)}
                    >
                      {branches.map(b => (
                          <option key={b.wpIdx} value={b.wpIdx}>{b.wpName}</option>
                      ))}
                    </Form.Select>
                )}

                <div className="d-flex align-items-center bg-white rounded-pill px-2 py-1 shadow-sm">
                  <Button variant="link" className="text-dark p-2" onClick={handlePrevWeek}>
                    <RiArrowLeftSLine size={24} />
                  </Button>
                  <span className="fw-bold px-3 d-flex flex-column align-items-center" style={{ minWidth: '150px' }}>
                  <span className="text-primary small">{format(currentWeekStart, 'yyyy')}년 {getWeekOfMonth(currentWeekStart, { weekStartsOn: 1 })}주차</span>
                  <span className="fs-6">{format(currentWeekStart, 'MM/dd')} ~ {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MM/dd')}</span>
                </span>
                  <Button variant="link" className="text-dark p-2" onClick={handleNextWeek}>
                    <RiArrowRightSLine size={24} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <Button variant="outline-secondary" className="fw-bold rounded-pill px-4 shadow-sm" onClick={handleDownloadPNG}>
                <RiDownload2Line className="me-2" /> 스케쥴 다운
              </Button>
              <Button variant="outline-primary" className="fw-bold rounded-pill px-4" onClick={() => setShowAddWorkerModal(true)}>
                <RiUserAddLine className="me-2" /> 타 지점 알바 추가
              </Button>
              <Button variant="outline-success" className="fw-bold rounded-pill px-4 shadow-sm" onClick={() => handleSaveAll(false)} disabled={saving || loading}>
                {saving ? <Spinner size="sm" /> : '임시 저장'}
              </Button>
              <Button variant="primary" className="fw-bold rounded-pill px-4 shadow-sm" onClick={() => handleSaveAll(true)} disabled={saving || loading}>
                {saving ? <Spinner size="sm" /> : '배정 확정'}
              </Button>
            </div>
          </div>

          {/* 필터 */}
          <div className="mb-3">
            <ButtonGroup>
              {[
                { value: 'ALL', name: '전체' },
                { value: 'APPLIED', name: '신청자' },
                { value: 'NOT_APPLIED', name: '미신청자' },
                { value: 'UNASSIGNED', name: '미배정자' }
              ].map((radio, idx) => (
                  <ToggleButton
                      key={idx}
                      id={`radio-${idx}`}
                      type="radio"
                      variant={filterType === radio.value ? 'primary' : 'outline-primary'}
                      name="radio"
                      value={radio.value}
                      checked={filterType === radio.value}
                      onChange={(e) => setFilterType(e.currentTarget.value)}
                      className="px-4 py-2 fw-bold"
                  >
                    {radio.name}
                  </ToggleButton>
              ))}
            </ButtonGroup>
          </div>

          {/* 테이블 (Card에 ref를 연결하여 타이틀과 표 전체를 동시에 깔끔하게 캡처) */}
          {loading ? <Loading /> : (
              <Card className="border-0 shadow-sm rounded-4 overflow-hidden" ref={tableRef} style={{ backgroundColor: 'var(--color-surface)' }}>

                {/* 다운로드(캡처) 중일 때만 최상단에 나타나는 타이틀 영역 */}
                {isExporting && (
                    <div className="p-4 pb-2 text-center border-bottom bg-white">
                      <h3 className="fw-bold mb-1">
                        {selectedBranchName} 주간 스케줄 배정
                      </h3>
                      <p className="text-muted small mb-0">
                        조회 기간: {format(currentWeekStart, 'yyyy년 MM월 dd일')} ~ {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy년 MM월 dd일')}
                      </p>
                    </div>
                )}

                <div className="table-responsive">
                  <Table bordered hover className="mb-0 align-middle text-center bg-white" style={{ minWidth: '1200px' }}>
                    <thead className="bg-light text-muted">
                    <tr>
                      <th className="py-3 px-4 text-start" style={{ width: '12%' }}>알바생 정보</th>
                      {weekDays.map(date => {
                        const y = getYear(date);
                        const m = getMonth(date) + 1;
                        const d = getDate(date);
                        const isHoly = isHoliday(y, m, d) || isSunday(date);
                        const isSat = isSaturday(date) && !isHoly;

                        return (
                            <th key={format(date, 'yyyy-MM-dd')} className={`py-3 align-middle bg-light ${isHoly ? 'text-danger' : isSat ? 'text-primary' : ''}`} style={{ minWidth: '150px' }}>
                              <div>{format(date, 'MM/dd')}</div>
                              <div className="small fw-normal">{'일월화수목금토'[getDay(date)]}요일</div>
                            </th>
                        );
                      })}
                    </tr>
                    </thead>
                    <tbody>
                    {renderUsers.map(u => {
                      const uid = toUserIdx(u.userIdx);
                      const userRemark = schedules.find(s => toUserIdx(s.userIdx) === uid && s.wsdRemarks)?.wsdRemarks || '';
                      return (
                          <tr key={uid}>
                            <td className="text-start px-4">
                              <div className="fw-bold fs-6">{u.userName}</div>
                              <div className="text-muted small d-flex flex-column gap-1 mt-1">
                                {u.workPlaceName !== selectedBranchName && (
                                    <Badge bg="secondary" className="align-self-start">{u.workPlaceName || '타 지점'}</Badge>
                                )}
                                {userRemark && (
                                    <div className="mt-1 text-secondary-emphasis" style={{ fontSize: '0.8rem'}}>
                                      <span className="fw-bold">비고:</span> {userRemark}
                                    </div>
                                )}
                              </div>
                            </td>
                            {weekDays.map(date => {
                              const dateStr = format(date, 'yyyy-MM-dd');
                              const dayShifts = editSchedules[uid]?.[dateStr] || [];

                              return (
                                  <td key={dateStr} className="p-2 align-top">
                                    {dayShifts.map(shift => (
                                        <div key={shift._id} className="assign-shift-card rounded-2 p-2 mb-2 text-start position-relative">
                                          <div className="d-flex justify-content-between mb-2 align-items-center">
                                            <span data-html2canvas-ignore="true" className="d-flex align-items-center">
                                              <Form.Check
                                                  type="checkbox"
                                                  checked={!!shift.wsdIsOpen}
                                                  onChange={(e) => handleUpdateShift(uid, dateStr, shift._id, { wsdIsOpen: e.target.checked })}
                                                  label="오픈"
                                                  className={`m-0 fw-bold small ${shift.wsdIsOpen ? 'text-primary' : 'text-muted'}`}
                                                  style={{ fontSize: '0.85rem' }}
                                              />
                                            </span>
                                            
                                            {canResetShift(shift) && (
                                            <span data-html2canvas-ignore="true">
                                              <Button 
                                                variant="dark" 
                                                size="sm" 
                                                className="p-1 rounded-2 d-flex align-items-center justify-content-center bg-opacity-25" 
                                                style={{ width: '28px', height: '28px' }} 
                                                onClick={() => handleRemoveShift(uid, dateStr, shift._id)}
                                              >
                                                <RiDeleteBinLine className="text-danger" size={16} />
                                              </Button>
                                            </span>
                                            )}
                                          </div>

                                          <div className="position-relative mt-1">
                                            <Form.Control
                                                size="sm"
                                                list={`time-options-${shift._id}`}
                                                value={shift.wsdStartTime || ''}
                                                placeholder={displayShiftStatus(shift.wsdStatus)}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  if (val === '미배정') {
                                                    handleUpdateShift(uid, dateStr, shift._id, { wsdStartTime: '', wsdStatus: '미배정', wsdIsOpen: false });
                                                  } else {
                                                    handleUpdateShift(uid, dateStr, shift._id, {
                                                      wsdStartTime: val,
                                                      ...(val ? { wsdStatus: '배정' } : {})
                                                    });
                                                  }
                                                }}
                                                className={`fw-bold text-center shadow-sm assign-status-input ${getShiftTone(shift)}`}
                                            />
                                            <datalist id={`time-options-${shift._id}`}>
                                              <option value="미배정" />
                                              {TIME_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                                            </datalist>
                                            {(shift.wsdStatus === '배정' || shift.wsdStatus === '타지점근무') && !shift.wsdIsConfirmed && (
                                              <div className="small text-center text-muted mt-1">임시 저장</div>
                                            )}
                                          </div>
                                        </div>
                                    ))}
                                    {dayShifts.length === 0 && (
                                        <div className="assign-shift-card rounded-2 p-2 mb-2 text-start">
                                          <Form.Control
                                              size="sm"
                                              readOnly
                                              value=""
                                              placeholder="미신청"
                                              className="fw-bold text-center shadow-sm assign-status-input unapplied mb-2"
                                          />
                                          <div data-html2canvas-ignore="true">
                                            <Button variant="outline-secondary" size="sm" className="w-100 border-dashed" onClick={() => handleAddShift(uid, dateStr)}>
                                              <RiAddLine /> 스케줄 추가
                                            </Button>
                                          </div>
                                        </div>
                                    )}
                                  </td>
                              );
                            })}
                          </tr>
                      );
                    })}
                    </tbody>
                  </Table>
                </div>
              </Card>
          )}

          {/* 타 지점 알바생 추가 모달 */}
          <Modal show={showAddWorkerModal} onHide={() => setShowAddWorkerModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title className="fw-bold fs-5">타 지점 알바생 추가</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-muted">이름으로 검색</Form.Label>
                <div className="position-relative">
                  <Form.Control
                      type="text"
                      placeholder="알바생 이름 입력"
                      value={workerSearchTerm}
                      onChange={(e) => setWorkerSearchTerm(e.target.value)}
                      className="pe-5 bg-light border-0"
                  />
                  <RiSearchLine className="position-absolute text-muted" style={{ top: '10px', right: '12px' }} size={18} />
                </div>
              </Form.Group>
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {allUsers
                    .filter(u => u.status !== '퇴사' && u.isActive !== false)
                    .filter(u => {
                      const wpIdx = u.workPlaceIdx || u.branchIdx || u.fkWorkPlaceIdx || branches.find(b => b.wpName === u.workPlaceName)?.wpIdx;
                      return Number(wpIdx) !== Number(currentWorkPlaceIdx);
                    })
                    .filter(u => u.userName?.includes(workerSearchTerm) || u.userId?.includes(workerSearchTerm))
                    .map(u => (
                        <div
                            key={u.userIdx}
                            className={`p-2 border rounded-2 d-flex justify-content-between align-items-center cursor-pointer ${selectedOtherUserIdx === u.userIdx ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                            onClick={() => setSelectedOtherUserIdx(u.userIdx)}
                            style={{ cursor: 'pointer' }}
                        >
                          <div>
                            <span className="fw-bold">{u.userName}</span>
                            <Badge bg="secondary" className="ms-2">{u.workPlaceName}</Badge>
                          </div>
                          {selectedOtherUserIdx === u.userIdx && <RiAddLine className="text-primary" />}
                        </div>
                    ))
                }
                {allUsers
                    .filter(u => u.status !== '퇴사' && u.isActive !== false)
                    .filter(u => {
                      const wpIdx = u.workPlaceIdx || u.branchIdx || u.fkWorkPlaceIdx || branches.find(b => b.wpName === u.workPlaceName)?.wpIdx;
                      return Number(wpIdx) !== Number(currentWorkPlaceIdx);
                    })
                    .filter(u => u.userName?.includes(workerSearchTerm) || u.userId?.includes(workerSearchTerm)).length === 0 && (
                    <div className="text-center text-muted small py-3">해당하는 알바생이 없습니다.</div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer className="border-0">
              <Button variant="light" onClick={() => setShowAddWorkerModal(false)}>취소</Button>
              <Button variant="primary" onClick={() => {
                if (selectedOtherUserIdx && !addedWorkerUserIdxs.includes(selectedOtherUserIdx)) {
                  const uid = toUserIdx(selectedOtherUserIdx);
                  setAddedWorkerUserIdxs(prev => [...prev, uid]);
                  const currentWeekDays = Array.from({ length: 7 }).map((_, i) => format(addDays(currentWeekStart, i), 'yyyy-MM-dd'));
                  setEditSchedules(prev => {
                    const nextUser = { ...(prev[uid] || {}) };
                    currentWeekDays.forEach(dt => {
                      if (!nextUser[dt] || nextUser[dt].length === 0) {
                        nextUser[dt] = [createEmptyShift(uid, dt, currentWorkPlaceIdx, '미신청')];
                      }
                    });
                    return { ...prev, [uid]: nextUser };
                  });
                }
                setShowAddWorkerModal(false);
                setSelectedOtherUserIdx('');
              }}>
                추가하기
              </Button>
            </Modal.Footer>
          </Modal>

        </Container>
      </div>
  );
};

export default AdminWeeklyAssign;