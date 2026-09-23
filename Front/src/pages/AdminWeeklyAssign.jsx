import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Spinner, Form, Modal, Badge } from 'react-bootstrap';
import { fetchWorkRequests, saveWorkSchedules } from '../api/workApi';
import { fetchWorkPlaces, fetchAllUsers } from '../api/authApi';
import { addDays, format, startOfWeek, endOfWeek, subWeeks, addWeeks, getWeekOfMonth, parseISO, getYear, getMonth, getDate, isSunday, isSaturday, getDay } from 'date-fns';
import { isHoliday } from 'holiday-kr';
import useAuthStore from '../store/useAuthStore';
import { countPeak } from '../utils/shiftPeak';
import { downloadWeeklyAssignExcel } from '../utils/weeklyAssignExcel';
import AssignTimeInput from '../components/AssignTimeInput';
import { openStartTimeForDate, toDateStr, normalizeScheduleStatus, resolveOriginFlags, resetShiftFields, withBaseline, isShiftDirty } from '../utils/shiftReset';
import { RiDownload2Line, RiUserAddLine, RiRefreshLine, RiSearchLine, RiAddLine, RiCloseLine } from 'react-icons/ri';
import PageHeader from '../components/ui/PageHeader';
import StatusChip from '../components/ui/StatusChip';
import SegmentedFilter from '../components/ui/SegmentedFilter';
import WeekNavigator from '../components/ui/WeekNavigator';
import StickyActionBar from '../components/ui/StickyActionBar';
import './AdminMain.css';
import './AdminWeeklyAssign.css';
import Loading from '../components/Loading';

const FILTERS = [
  { value: 'ALL', name: '전체' },
  { value: 'ATTENDING', name: '출근' },
  { value: 'NOT_ATTENDING', name: '미출근' }
];

const LEGEND = [
  { tone: 'unapplied', label: '미신청' },
  { tone: 'applied', label: '신청' },
  { tone: 'unassigned', label: '미출근' },
  { tone: 'assigned', label: '출근' }
];

const toUserIdx = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
};

const createEmptyShift = (userIdx, dateStr, workPlaceIdx, status = null) => withBaseline({
  _id: Math.random().toString(36).slice(2, 11),
  userIdx,
  date: dateStr,
  wsdStatus: status,
  wsdStartTime: '',
  wsdWorkPlaceIdx: workPlaceIdx,
  wsdIsConfirmed: false,
  wsdIsOpen: false,
  openApplied: false,
  originHadApply: false,
  originOpenApplied: false
});

const displayShiftStatus = (shift) => {
  const st = shift?.wsdStatus;
  if (!st) return '미신청';
  if (st === '신청' && shift.originOpenApplied && !shift.wsdIsOpen) return '신청 · 오픈';
  return st;
};

const getShiftTone = (shift) => {
  const st = shift.wsdStatus;
  if (st === '출근' && (shift.wsdStartTime || shift.wsdIsOpen)) return 'assigned';
  if (st === '신청') return 'applied';
  if (st === '미출근') return 'unassigned';
  return 'unapplied';
};

const canResetShift = (shift) => isShiftDirty(shift);

const dayMeta = (date) => {
  const y = getYear(date);
  const m = getMonth(date) + 1;
  const d = getDate(date);
  const isHoly = isHoliday(y, m, d) || isSunday(date);
  const isSat = isSaturday(date) && !isHoly;
  return { isHoly, isSat };
};

const AdminWeeklyAssign = () => {
  const { user } = useAuthStore();

  const [selectedWpIdx, setSelectedWpIdx] = useState(user?.workPlaceIdx || null);
  const [branches, setBranches] = useState([]);

  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [allUsers, setAllUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [filterType, setFilterType] = useState('ALL');
  const [mobileDayIdx, setMobileDayIdx] = useState(0);

  const [addedWorkerUserIdxs, setAddedWorkerUserIdxs] = useState([]);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [selectedOtherUserIdx, setSelectedOtherUserIdx] = useState('');
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editSchedules, setEditSchedules] = useState({});

  const currentBranchObj = useMemo(() => {
    if (branches.length === 0) return null;
    return branches.find(b => Number(b.wpIdx) === Number(selectedWpIdx)) || branches[0];
  }, [branches, selectedWpIdx]);

  const currentWorkPlaceIdx = currentBranchObj?.wpIdx || user?.workPlaceIdx || 1;
  const selectedBranchName = currentBranchObj?.wpName || user?.workPlaceName || user?.branch || '지점';

  const handleDownloadExcel = async () => {
    try {
      await downloadWeeklyAssignExcel({
        branchName: selectedBranchName,
        weekStart: currentWeekStart,
        weekDays,
        users: renderUsers,
        editSchedules,
        toUserIdx,
      });
    } catch (err) {
      console.error(err);
      alert('엑셀 다운로드 중 오류가 발생했습니다.');
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

        const status = normalizeScheduleStatus(sch);
        const { openApplied, originHadApply, originOpenApplied } = resolveOriginFlags(sch, status);
        const isOpen = !!sch.wsdIsOpen;
        const startTime = sch.wsdStartTime || sch.startTime || '';
        initialEdits[uid][dt].push(withBaseline({
          ...sch,
          _id: Math.random().toString(36).slice(2, 11),
          userIdx: uid,
          date: dt,
          wsdStatus: status,
          wsdStartTime: startTime,
          wsdWorkPlaceIdx: sch.wsdWorkPlaceIdx || sch.applyWorkPlaceIdx || sch.workPlaceIdx || sch.fkWorkPlaceIdx || currentWorkPlaceIdx,
          wsdIsConfirmed: !!sch.wsdIsConfirmed,
          openApplied,
          wsdIsOpen: isOpen,
          originHadApply,
          originOpenApplied
        }));
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
              initialEdits[uid][dt] = [createEmptyShift(uid, dt, currentWorkPlaceIdx, null)];
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
    setMobileDayIdx(0);
    loadData();
  }, [currentWeekStart, selectedWpIdx]);

  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const isThisWeek = format(currentWeekStart, 'yyyy-MM-dd') === format(thisWeekStart, 'yyyy-MM-dd');
  const handleGoThisWeek = () => setCurrentWeekStart(thisWeekStart);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const peakByDate = useMemo(() => {
    const map = {};
    weekDays.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayShifts = [];
      Object.values(editSchedules).forEach(userDays => {
        (userDays[dateStr] || []).forEach(s => {
          if (Number(s.wsdWorkPlaceIdx || currentWorkPlaceIdx) === Number(currentWorkPlaceIdx)) {
            dayShifts.push(s);
          }
        });
      });
      map[dateStr] = countPeak(dayShifts, { requireConfirmed: false });
    });
    return map;
  }, [editSchedules, weekDays, currentWorkPlaceIdx]);

  /**
   * 주간 배정 상태:
   *   'unset'     - 배정된 출근 없음
   *   'draft'     - 출근 있지만 isConfirmed=false (임시 저장 상태)
   *   'partial'   - 일부 isConfirmed=true, 일부 신청 남아있음 (임시 배정 상태)
   *   'confirmed' - 출근 모두 isConfirmed=true, 신청 셀 없음 (완전 확정)
   */
  const weekAssignStatus = useMemo(() => {
    let sawAttending = false;
    let hasConfirmed = false;
    let hasUnconfirmed = false;
    let hasPendingApply = false;

    Object.values(editSchedules).forEach(userDays => {
      Object.values(userDays).forEach(shifts => {
        (shifts || []).forEach(s => {
          if (Number(s.wsdWorkPlaceIdx || currentWorkPlaceIdx) !== Number(currentWorkPlaceIdx)) return;
          if (s.wsdStatus === '출근' && (s.wsdStartTime || s.wsdIsOpen)) {
            sawAttending = true;
            if (s.wsdIsConfirmed) hasConfirmed = true;
            else hasUnconfirmed = true;
          }
          if (s.wsdStatus === '신청') hasPendingApply = true;
        });
      });
    });

    if (!sawAttending) return 'unset';
    if (hasUnconfirmed && !hasConfirmed) return 'draft';
    if (hasConfirmed && (hasUnconfirmed || hasPendingApply)) return 'partial';
    return 'confirmed';
  }, [editSchedules, currentWorkPlaceIdx]);

  const handlePickWeekDate = (value) => {
    if (!value) return;
    setCurrentWeekStart(startOfWeek(parseISO(value), { weekStartsOn: 1 }));
  };

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
        const hasAssignment = allDaySchs.some(s => s.wsdStatus === '출근' || s.status === '출근');

        if (filterType === 'ATTENDING') return hasAssignment;
        if (filterType === 'NOT_ATTENDING') return !hasAssignment;
        return true;
      });
    }

    return usersToShow;
  }, [allUsers, editSchedules, currentWorkPlaceIdx, addedWorkerUserIdxs, filterType, branches]);

  const resolveUserHomeWpIdx = (u) => (
    u.workPlaceIdx || u.branchIdx || u.fkWorkPlaceIdx
      || branches.find(b => b.wpName === u.workPlaceName)?.wpIdx
      || null
  );

  const isOtherBranchWorker = (u) =>
    Number(resolveUserHomeWpIdx(u)) !== Number(currentWorkPlaceIdx);

  const handleRemoveOtherWorker = (u) => {
    if (!isOtherBranchWorker(u)) return;
    if (!window.confirm(
      `${u.userName}님의 배정 내역을 초기화합니다.\n신청 내역은 유지되며, 배정 확정 시 미출근으로 처리됩니다.`
    )) return;

    const uid = toUserIdx(u.userIdx || u.id);
    // 목록에서 제거하지 않고 셀만 baseline으로 복원 → 신청 행이 남아 그리드에 계속 표시됨
    setEditSchedules(prev => {
      const userDays = prev[uid];
      if (!userDays) return prev;
      const nextDays = {};
      Object.keys(userDays).forEach(dt => {
        nextDays[dt] = userDays[dt].map(s => resetShiftFields(s));
      });
      return { ...prev, [uid]: nextDays };
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
        nextShift.wsdStatus = '출근';
      } else if (patch.wsdIsOpen === false) {
        nextShift.wsdIsOpen = false;
      }
      // 내용 바꾸면 확정 해제 → 다시 배정 확정 필요
      if ('wsdStartTime' in patch || 'wsdStatus' in patch || 'wsdIsOpen' in patch) {
        nextShift.wsdIsConfirmed = false;
      }
      arr[idx] = nextShift;
      nextUser[dateStr] = arr;
      return { ...prev, [uid]: nextUser };
    });
  };

  const handleRemoveShift = (userIdx, dateStr, id) => {
    if (!window.confirm("변경 내용을 되돌릴까요?\n(마지막에 불러온 저장 상태로 복원됩니다)")) return;
    const uid = toUserIdx(userIdx);
    setEditSchedules(prev => {
      const nextUser = { ...(prev[uid] || {}) };
      const arr = [...(nextUser[dateStr] || [])];
      const idx = arr.findIndex(s => s._id === id);
      if (idx === -1) return prev;
      arr[idx] = resetShiftFields(arr[idx]);
      nextUser[dateStr] = arr;
      return { ...prev, [uid]: nextUser };
    });
  };

  /**
   * mode: 'DRAFT' | 'PARTIAL' | 'CONFIRM'
   *   DRAFT   - 임시 저장: 신청 셀 건드리지 않음, isConfirmed=false (workers 미공개)
   *   PARTIAL - 임시 배정: 출근 셀만 isConfirmed=true, 신청 셀은 신청 그대로 유지 (부분 공개)
   *   CONFIRM - 배정 확정: 출근 isConfirmed=true, 남은 신청 → 미출근 (완전 확정)
   */
  const handleSaveAll = async (mode = 'CONFIRM') => {
    const MSG = {
      DRAFT:   { confirm: "임시 저장하시겠습니까?\n(아직 알바생들에게 공개되지 않습니다)", done: "임시 저장이 완료되었습니다." },
      PARTIAL: { confirm: "임시 배정하시겠습니까?\n(배정된 날은 알바생에게 공개되고, 미배정 날은 신청 상태로 유지됩니다)", done: "임시 배정이 완료되었습니다." },
      CONFIRM: { confirm: "배정을 확정하시겠습니까?\n(알바생들에게 최종 결과가 공개됩니다)", done: "배정이 확정되었습니다." },
    };

    if (mode === 'CONFIRM' || mode === 'PARTIAL') {
      const hasAnyAttending = Object.values(editSchedules).some(userDays =>
        Object.values(userDays).some(shifts =>
          shifts.some(s => {
            if (s.wsdStatus !== '출근') return false;
            const wpIdx = s.wsdWorkPlaceIdx || currentWorkPlaceIdx;
            return Number(wpIdx) === Number(currentWorkPlaceIdx) && (s.wsdStartTime || s.wsdIsOpen);
          })
        )
      );
      if (!hasAnyAttending) {
        alert('출근 배정된 알바생이 없습니다.\n최소 한 명 이상 배정한 후 진행해 주세요.');
        return;
      }
    }

    if (!window.confirm(MSG[mode].confirm)) return;
    setSaving(true);

    const payload = [];
    const attendingKeys = new Set();
    const pendingOff = []; // CONFIRM 모드에서만 미출근 변환 대상

    Object.keys(editSchedules).forEach(uIdx => {
      Object.keys(editSchedules[uIdx]).forEach(dStr => {
        const shifts = editSchedules[uIdx][dStr];
        shifts.forEach(shift => {
          let status = shift.wsdStatus;
          if (status === '배정' || status === '타지점근무' || status === '신규') status = '출근';
          if (status === '미배정' || status === '미신청') status = status === '미배정' ? '미출근' : null;

          const startTimeRaw = shift.wsdStartTime
            || (shift.wsdIsOpen ? openStartTimeForDate(dStr) : '');
          if (status === '신청' && (shift.wsdIsOpen || startTimeRaw)) {
            status = '출근';
          }

          const wpIdx = shift.wsdWorkPlaceIdx || currentWorkPlaceIdx;
          const key = `${Number(uIdx)}|${dStr}|${Number(wpIdx)}`;

          if (!status) return;

          if (status === '신청') {
            // DRAFT, PARTIAL: 신청은 DB에 그대로 둠 (payload에 포함하지 않음)
            // CONFIRM: 신청 → 미출근 변환 대상으로 수집
            if (mode === 'CONFIRM') {
              pendingOff.push({ userIdx: Number(uIdx), date: dStr, workPlaceIdx: wpIdx, key });
            }
            return;
          }

          if (status === '출근') {
            attendingKeys.add(key);
          }

          payload.push({
            userIdx: Number(uIdx),
            date: dStr,
            status,
            startTime: startTimeRaw ? (startTimeRaw.match(/(\d{2}:\d{2})/) ? startTimeRaw.match(/(\d{2}:\d{2})/)[1] : startTimeRaw) : '',
            workPlaceIdx: wpIdx,
            // DRAFT: isConfirmed=false / PARTIAL,CONFIRM: 출근만 isConfirmed=true
            isConfirmed: (mode === 'PARTIAL' || mode === 'CONFIRM') && status === '출근',
            isOpen: shift.wsdIsOpen || false
          });
        });
      });
    });

    // CONFIRM 모드: 출근이 없는 신청 셀 → 미출근
    if (mode === 'CONFIRM') {
      pendingOff.forEach(item => {
        if (attendingKeys.has(item.key)) return;
        payload.push({
          userIdx: item.userIdx,
          date: item.date,
          status: '미출근',
          startTime: '',
          workPlaceIdx: item.workPlaceIdx,
          isConfirmed: false,
          isOpen: false
        });
      });
    }

    const startDateStr = format(currentWeekStart, 'yyyy-MM-dd');
    const endDateStr = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const isFullConfirm = mode === 'CONFIRM';
    const res = await saveWorkSchedules(payload, startDateStr, endDateStr, currentWorkPlaceIdx, isFullConfirm, mode);
    setSaving(false);
    if (res.success) {
      const msg = typeof res.data === 'string' ? res.data : null;
      alert(msg || MSG[mode].done);
      loadData();
    } else {
      alert(res.error || "저장에 실패했습니다.");
    }
  };

  const renderShiftBlock = (uid, dateStr, shift) => {
    const openHint = !!shift.originOpenApplied && !shift.wsdIsOpen;
    return (
      <div key={shift._id} className="wat-shift">
        <div className="wat-shift-top" data-html2canvas-ignore="true">
          <Form.Check
            type="checkbox"
            checked={!!shift.wsdIsOpen}
            onChange={(e) => handleUpdateShift(uid, dateStr, shift._id, { wsdIsOpen: e.target.checked })}
            label="오픈"
            title={openHint ? '오픈으로 신청됨 — 체크하면 오픈 출근' : undefined}
            className={`wat-open-check ${shift.wsdIsOpen ? 'is-on' : ''} ${openHint ? 'is-hint' : ''}`}
          />
          {canResetShift(shift) && (
            <Button
              variant="link"
              size="sm"
              className="wat-icon-btn"
              title="되돌리기"
              aria-label="되돌리기"
              onClick={() => handleRemoveShift(uid, dateStr, shift._id)}
            >
              <RiRefreshLine size={15} />
            </Button>
          )}
        </div>
        <AssignTimeInput
          value={shift.wsdStartTime || ''}
          placeholder={displayShiftStatus(shift)}
          disabled={!!shift.wsdIsOpen}
          readOnly={!!shift.wsdIsOpen}
          className={`wat-shift-input assign-status-input ${getShiftTone(shift)}`}
          onPick={(val) => {
            if (shift.wsdIsOpen) return;
            if (val === '미출근') {
              handleUpdateShift(uid, dateStr, shift._id, { wsdStartTime: '', wsdStatus: '미출근', wsdIsOpen: false });
            } else {
              handleUpdateShift(uid, dateStr, shift._id, {
                wsdStartTime: val,
                ...(val ? { wsdStatus: '출근' } : { wsdStatus: null })
              });
            }
          }}
        />
      </div>
    );
  };

  const renderDayCell = (uid, dateStr) => {
    const dayShifts = editSchedules[uid]?.[dateStr] || [];
    return (
      <>
        {dayShifts.map(shift => renderShiftBlock(uid, dateStr, shift))}
        {dayShifts.length === 0 && (
          <div className="wat-shift">
            <Form.Control
              size="sm"
              readOnly
              value=""
              placeholder="미신청"
              className="wat-shift-input assign-status-input unapplied"
            />
          </div>
        )}
      </>
    );
  };

  const mobileDate = weekDays[mobileDayIdx] || weekDays[0];
  const mobileDateStr = mobileDate ? format(mobileDate, 'yyyy-MM-dd') : '';

  return (
    <div className="admin-container ui-page wat-page">
      <Container fluid className="px-3 px-md-4 py-3">
        <PageHeader
          title="주간 스케줄 배정"
          status={
            <StatusChip tone={weekAssignStatus}>
              {{
                unset: '배정 전',
                draft: '임시 저장',
                partial: '임시 배정',
                confirmed: '확정',
              }[weekAssignStatus]}
            </StatusChip>
          }
        />

        <div className="ui-toolbar-card">
          {branches.length > 0 && (
            <Form.Select
              className="wat-branch-select"
              value={selectedWpIdx || ''}
              onChange={(e) => setSelectedWpIdx(e.target.value)}
            >
              {branches.map(b => (
                <option key={b.wpIdx} value={b.wpIdx}>{b.wpName}</option>
              ))}
            </Form.Select>
          )}

          <WeekNavigator
            labelTop={`${format(currentWeekStart, 'yyyy')}년 ${getWeekOfMonth(currentWeekStart, { weekStartsOn: 1 })}주차`}
            labelBottom={`${format(currentWeekStart, 'MM/dd')} ~ ${format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MM/dd')}`}
            dateValue={format(currentWeekStart, 'yyyy-MM-dd')}
            onPickDate={handlePickWeekDate}
            onPrev={handlePrevWeek}
            onNext={handleNextWeek}
            showThisWeek={!isThisWeek}
            onThisWeek={handleGoThisWeek}
          />

          <SegmentedFilter
            options={FILTERS.map(f => ({ value: f.value, label: f.name }))}
            value={filterType}
            onChange={setFilterType}
          />
        </div>

        <div className="ui-legend" data-html2canvas-ignore="true">
          {LEGEND.map(item => (
            <span key={item.tone} className="ui-legend-item">
              <span className={`ui-legend-swatch wat-legend-swatch ${item.tone}`} />
              {item.label}
            </span>
          ))}
        </div>

        {loading ? <Loading /> : (
          <>
            <div className="wat-day-tabs" data-html2canvas-ignore="true">
              {weekDays.map((date, idx) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const { isHoly, isSat } = dayMeta(date);
                const peak = peakByDate[dateStr] || 0;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    className={`wat-day-tab ${mobileDayIdx === idx ? 'active' : ''} ${isHoly ? 'is-holy' : ''} ${isSat ? 'is-sat' : ''}`}
                    onClick={() => setMobileDayIdx(idx)}
                  >
                    <div>{'월화수목금토일'[idx]}</div>
                    <div className="small fw-normal">{format(date, 'MM/dd')}</div>
                    <span className={`wat-peak-chip ${peak === 0 ? 'is-zero' : ''}`}>P{peak}</span>
                  </button>
                );
              })}
            </div>

            <div className="wat-mobile-list" data-html2canvas-ignore="true">
              {renderUsers.map(u => {
                const uid = toUserIdx(u.userIdx);
                const userRemark = schedules.find(s => toUserIdx(s.userIdx) === uid && s.wsdRemarks)?.wsdRemarks || '';
                const other = isOtherBranchWorker(u);
                return (
                  <div key={uid} className="wat-mobile-card">
                    <div className="wat-mobile-card-head">
                      <div>
                        <div className="wat-worker-name">
                          {u.userName}
                          {Number(u.nameSeq) > 1 && (
                            <Badge bg="secondary" className="ms-1 align-middle">{u.nameSeq}</Badge>
                          )}
                        </div>
                        <div className="wat-worker-meta">
                          {other && (
                            <Badge bg="secondary" className="me-1">{u.workPlaceName || '타 지점'}</Badge>
                          )}
                          {userRemark && <span>비고: {userRemark}</span>}
                        </div>
                      </div>
                      {other && (
                        <Button
                          variant="link"
                          size="sm"
                          className="wat-icon-btn"
                          title="타지점 알바생 제거"
                          aria-label="타지점 알바생 제거"
                          onClick={() => handleRemoveOtherWorker(u)}
                        >
                          <RiCloseLine size={16} />
                        </Button>
                      )}
                    </div>
                    {renderDayCell(uid, mobileDateStr)}
                  </div>
                );
              })}
              {renderUsers.length === 0 && (
                <div className="text-center text-muted py-4 small">표시할 알바생이 없습니다.</div>
              )}
            </div>

            <div className="wat-board wat-desktop-grid">
              <div className="wat-board-scroll">
                <table className="wat-table w-100">
                  <thead>
                    <tr>
                      <th className="wat-sticky-col">알바생</th>
                      {weekDays.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const { isHoly, isSat } = dayMeta(date);
                        const peak = peakByDate[dateStr] || 0;
                        return (
                          <th
                            key={dateStr}
                            className={`wat-day-head ${isHoly ? 'is-holy' : ''} ${isSat ? 'is-sat' : ''}`}
                          >
                            <div>{format(date, 'MM/dd')}</div>
                            <div className="small fw-normal">{'일월화수목금토'[getDay(date)]}요일</div>
                            <span className={`wat-peak-chip ${peak === 0 ? 'is-zero' : ''}`}>
                              피크 {peak}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {renderUsers.map(u => {
                      const uid = toUserIdx(u.userIdx);
                      const userRemark = schedules.find(s => toUserIdx(s.userIdx) === uid && s.wsdRemarks)?.wsdRemarks || '';
                      const other = isOtherBranchWorker(u);
                      return (
                        <tr key={uid}>
                          <td className="wat-sticky-col">
                            <div className="wat-worker-head">
                              <div>
                                <div className="wat-worker-name">
                                  {u.userName}
                                  {Number(u.nameSeq) > 1 && (
                                    <Badge bg="secondary" className="ms-1 align-middle">{u.nameSeq}</Badge>
                                  )}
                                </div>
                                <div className="wat-worker-meta">
                                  {other && (
                                    <Badge bg="secondary" className="mb-1">{u.workPlaceName || '타 지점'}</Badge>
                                  )}
                                  {userRemark && (
                                    <div><span className="fw-bold">비고:</span> {userRemark}</div>
                                  )}
                                </div>
                              </div>
                              {other && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="wat-icon-btn"
                                  title="타지점 알바생 제거"
                                  aria-label="타지점 알바생 제거"
                                  onClick={() => handleRemoveOtherWorker(u)}
                                >
                                  <RiCloseLine size={16} />
                                </Button>
                              )}
                            </div>
                          </td>
                          {weekDays.map(date => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            return (
                              <td key={dateStr} className="wat-cell">
                                {renderDayCell(uid, dateStr)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {renderUsers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-5">
                          표시할 알바생이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <StickyActionBar
          left={
            <>
              <Button variant="outline-secondary" onClick={handleDownloadExcel}>
                <RiDownload2Line className="me-1" /> 엑셀
              </Button>
              <Button variant="outline-primary" onClick={() => setShowAddWorkerModal(true)}>
                <RiUserAddLine className="me-1" /> 타지점
              </Button>
            </>
          }
          right={
            <>
              <Button
                variant="outline-secondary"
                onClick={() => handleSaveAll('DRAFT')}
                disabled={saving || loading}
                title="저장만 합니다. 알바생에게 공개되지 않습니다."
              >
                {saving ? <Spinner size="sm" /> : '임시 저장'}
              </Button>
              <Button
                variant="outline-success"
                onClick={() => handleSaveAll('PARTIAL')}
                disabled={saving || loading}
                title="배정된 날만 공개됩니다. 미배정 날은 신청 상태로 유지됩니다."
              >
                {saving ? <Spinner size="sm" /> : '임시 배정'}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSaveAll('CONFIRM')}
                disabled={saving || loading}
                title="모든 날을 확정합니다. 미배정 신청은 미출근으로 처리됩니다."
              >
                {saving ? <Spinner size="sm" /> : '배정 확정'}
              </Button>
            </>
          }
        />

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
                    className={`p-2 border rounded-2 d-flex justify-content-between align-items-center ${selectedOtherUserIdx === u.userIdx ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                    onClick={() => setSelectedOtherUserIdx(u.userIdx)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <span className="fw-bold">{u.userName}</span>
                      {Number(u.nameSeq) > 1 && (
                        <Badge bg="secondary" className="ms-1">{u.nameSeq}</Badge>
                      )}
                      <Badge bg="secondary" className="ms-2">{u.workPlaceName}</Badge>
                    </div>
                    {selectedOtherUserIdx === u.userIdx && <RiAddLine className="text-primary" />}
                  </div>
                ))}
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
                      nextUser[dt] = [createEmptyShift(uid, dt, currentWorkPlaceIdx, null)];
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
