import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Container, Button, Spinner, Form, Modal, Badge } from 'react-bootstrap';
import { fetchWorkRequests, saveWorkSchedules } from '../api/workApi';
import { fetchWorkPlaces, fetchAllUsers } from '../api/authApi';
import { addDays, format, startOfWeek, endOfWeek, subWeeks, addWeeks, getWeekOfMonth, parseISO, getYear, getMonth, getDate, isSunday, isSaturday, getDay } from 'date-fns';
import { isHoliday } from 'holiday-kr';
import useAuthStore from '../store/useAuthStore';
import { countPeak } from '../utils/shiftPeak';
import { downloadWeeklyAssignExcel } from '../utils/weeklyAssignExcel';
import useSyncExcelDownloadProgress from '../hooks/useSyncExcelDownloadProgress';
import AssignTimeInput, { TIME_OPTIONS, BULK_LIST_OPTIONS } from '../components/AssignTimeInput';
import { openStartTimeForDate, toDateStr, normalizeScheduleStatus, resolveOriginFlags, resetShiftFields, withBaseline, isShiftDirty } from '../utils/shiftReset';
import { RiDownload2Line, RiUserAddLine, RiRefreshLine, RiSearchLine, RiAddLine, RiCloseLine, RiQuestionLine, RiTimeLine } from 'react-icons/ri';
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

const DAY_FILTER_OPTIONS = [
  { value: 'ALL', name: '전체' },
  { value: '0', name: '월' },
  { value: '1', name: '화' },
  { value: '2', name: '수' },
  { value: '3', name: '목' },
  { value: '4', name: '금' },
  { value: '5', name: '토' },
  { value: '6', name: '일' }
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
  wsdIsClose: false,
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
  if (st === '출근' && (shift.wsdStartTime || shift.wsdIsOpen || shift.wsdIsClose)) return 'assigned';
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

const RemarkCell = ({ text, userName, onOpen }) => {
  const contentRef = useRef(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    if (!text) {
      setHasOverflow(false);
      return;
    }
    const el = contentRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setHasOverflow(el.scrollHeight > el.clientHeight + 2);
    };
    checkOverflow();

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(checkOverflow);
      resizeObserver.observe(el);
    }
    window.addEventListener('resize', checkOverflow);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  if (!text) {
    return <span className="text-muted text-center d-block">-</span>;
  }

  return (
    <div
      className={`wat-remark-box ${hasOverflow ? 'is-overflow' : ''}`}
      onClick={hasOverflow ? () => onOpen(userName, text) : undefined}
      title={hasOverflow ? '클릭하여 전체 비고 보기' : text}
      role={hasOverflow ? 'button' : undefined}
      tabIndex={hasOverflow ? 0 : undefined}
      onKeyDown={hasOverflow ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(userName, text);
        }
      } : undefined}
    >
      <div ref={contentRef} className="wat-remark-text">
        {text}
      </div>
      {hasOverflow && (
        <span className="wat-remark-corner-mark" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="2.5" y1="8.5" x2="8.5" y2="2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="6" y1="9" x2="9" y2="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </div>
  );
};

const AdminWeeklyAssign = () => {
  const { user } = useAuthStore();

  const [selectedWpIdx, setSelectedWpIdx] = useState(user?.workPlaceIdx || null);
  const [branches, setBranches] = useState([]);

  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [allUsers, setAllUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [filterType, setFilterType] = useState('ALL');
  const [dayFilter, setDayFilter] = useState('ALL');
  const [mobileDayIdx, setMobileDayIdx] = useState(0);

  const [addedWorkerUserIdxs, setAddedWorkerUserIdxs] = useState([]);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [remarkModal, setRemarkModal] = useState({ show: false, userName: '', text: '' });
  const [selectedOtherUserIdx, setSelectedOtherUserIdx] = useState('');
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editSchedules, setEditSchedules] = useState({});

  const {
    busy: excelDownloading,
    runDownload: runExcelDownload,
    ProgressModal: ExcelDownloadProgressModal,
  } = useSyncExcelDownloadProgress({
    title: '배정표 엑셀 생성 중...',
    description: '브라우저에서 엑셀 파일을 만드는 중입니다.',
    cancelHint: '화면만 닫습니다. 이미 파일 생성이 시작된 경우 잠시 후 다운로드가 완료될 수 있습니다.',
  });

  const currentBranchObj = useMemo(() => {
    if (branches.length === 0) return null;
    return branches.find(b => Number(b.wpIdx) === Number(selectedWpIdx)) || branches[0];
  }, [branches, selectedWpIdx]);

  const currentWorkPlaceIdx = currentBranchObj?.wpIdx || user?.workPlaceIdx || 1;
  const selectedBranchName = currentBranchObj?.wpName || user?.workPlaceName || user?.branch || '지점';

  const handleDownloadExcel = async () => {
    if (excelDownloading) return;
    await runExcelDownload(async () => {
      try {
        await downloadWeeklyAssignExcel({
          branchName: selectedBranchName,
          weekStart: currentWeekStart,
          weekDays,
          users: renderUsers,
          editSchedules,
          toUserIdx,
          schedules,
        });
        return { success: true };
      } catch (err) {
        console.error(err);
        return { success: false, error: '엑셀 다운로드 중 오류가 발생했습니다.' };
      }
    });
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
      // Prefer isAdmin flag (userTypeIdx is legacy and no longer returned by API)
      list = list.filter(u => Number(u.is_admin ?? u.isAdmin ?? 0) !== 1);
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
        const isOpen = !!(sch.wsdIsOpen ?? sch.isOpen);
        const isClose = !!(sch.wsdIsClose ?? sch.isClose);
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
          wsdIsClose: isClose,
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

  const appliedCountByDate = useMemo(() => {
    const map = {};
    weekDays.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      let count = 0;
      Object.entries(editSchedules).forEach(([uid, userDays]) => {
        const dayShifts = userDays[dateStr] || [];
        const hasApplied = dayShifts.some(s => {
          const wpIdx = s.wsdWorkPlaceIdx || s.applyWorkPlaceIdx || currentWorkPlaceIdx;
          if (Number(wpIdx) !== Number(currentWorkPlaceIdx)) return false;
          return !!(s.originHadApply || s.originOpenApplied || s.wsdStatus === '신청');
        });
        if (hasApplied) count++;
      });
      map[dateStr] = count;
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

  const resolveUserHomeWpIdx = (u) => (
    u.workPlaceIdx ?? u.branchIdx ?? u.fkWorkPlaceIdx
    ?? branches.find(b => b.wpName === u.workPlaceName)?.wpIdx
    ?? null
  );

  const isActiveWorker = (u) => {
    if (u.status === '퇴사') return false;
    if (u.isActive === false) return false;
    if (u.userIsActive === 0 || u.userIsActive === false) return false;
    return true;
  };

  const isOnLeave = (u) => (
    Number(u.userIsActive) === 2 || u.status === '휴직'
  );

  const isOtherBranchWorker = (u) =>
    Number(resolveUserHomeWpIdx(u)) !== Number(currentWorkPlaceIdx);

  const hasHomeBranchSchedule = (uid) => {
    const userDays = editSchedules[uid];
    if (!userDays) return false;
    return Object.values(userDays).some((daySchs) =>
      (daySchs || []).some(
        (s) => Number(s.wsdWorkPlaceIdx || s.applyWorkPlaceIdx || currentWorkPlaceIdx) === Number(currentWorkPlaceIdx)
      )
    );
  };

  const isOtherWorkerOnGrid = (uid) => (
    addedWorkerUserIdxs.some((id) => toUserIdx(id) === uid) || hasHomeBranchSchedule(uid)
  );

  const hasApplyAtHomeBranch = (uid) => {
    const userDays = editSchedules[uid] || {};
    return Object.values(userDays).flat().some((s) => {
      if (Number(s.wsdWorkPlaceIdx || s.applyWorkPlaceIdx || currentWorkPlaceIdx) !== Number(currentWorkPlaceIdx)) {
        return false;
      }
      return !!(s.originHadApply || s.originOpenApplied || s.wsdStatus === '신청');
    });
  };

  const renderUsers = useMemo(() => {
    let usersToShow = allUsers.filter(u => {
      if (!isActiveWorker(u)) return false;
      const uid = toUserIdx(u.userIdx || u.id);
      const wpIdx = resolveUserHomeWpIdx(u);
      const isHome = Number(wpIdx) === Number(currentWorkPlaceIdx);
      const hasScheduleForHome = hasHomeBranchSchedule(uid);
      const isAdded = addedWorkerUserIdxs.some((id) => toUserIdx(id) === uid);
      return isHome || hasScheduleForHome || isAdded;
    });

    if (filterType !== 'ALL' || dayFilter !== 'ALL') {
      usersToShow = usersToShow.filter(u => {
        const uid = toUserIdx(u.userIdx || u.id);
        const userSchs = editSchedules[uid] || {};

        if (dayFilter === 'ALL') {
          const allDaySchs = Object.values(userSchs).flat();
          const hasAssignment = allDaySchs.some(s => s.wsdStatus === '출근' || s.status === '출근');

          if (filterType === 'ATTENDING') return hasAssignment;
          if (filterType === 'NOT_ATTENDING') return !hasAssignment;
          return true;
        } else {
          // 특정 요일 기준 (월: 0, 화: 1, ..., 일: 6)
          const targetDate = weekDays[Number(dayFilter)];
          if (!targetDate) return true;
          const targetDateStr = format(targetDate, 'yyyy-MM-dd');
          const dayShifts = userSchs[targetDateStr] || [];
          const isAttendingOnDay = dayShifts.some(s => s.wsdStatus === '출근' || s.status === '출근');

          if (filterType === 'ATTENDING') return isAttendingOnDay;
          if (filterType === 'NOT_ATTENDING') return !isAttendingOnDay;
          return true;
        }
      });
    }

    // 본점 → 타지점 → 휴직(맨 밑), 같은 그룹 안에서는 이름순
    usersToShow = [...usersToShow].sort((a, b) => {
      const groupOf = (u) => {
        if (isOnLeave(u)) return 2;
        if (isOtherBranchWorker(u)) return 1;
        return 0;
      };
      const ga = groupOf(a);
      const gb = groupOf(b);
      if (ga !== gb) return ga - gb;
      return (a.userName || '').localeCompare(b.userName || '', 'ko');
    });

    return usersToShow;
  }, [allUsers, editSchedules, currentWorkPlaceIdx, addedWorkerUserIdxs, filterType, dayFilter, weekDays, branches]);

  const otherBranchCandidates = useMemo(() => {
    const term = (workerSearchTerm || '').trim().toLowerCase();
    return allUsers
      .filter(isActiveWorker)
      .filter((u) => Number(resolveUserHomeWpIdx(u)) !== Number(currentWorkPlaceIdx))
      .filter((u) => {
        if (!term) return true;
        const name = (u.userName || '').toLowerCase();
        const id = (u.userId || '').toLowerCase();
        return name.includes(term) || id.includes(term);
      })
      .slice()
      .sort((a, b) => {
        const la = isOnLeave(a) ? 1 : 0;
        const lb = isOnLeave(b) ? 1 : 0;
        if (la !== lb) return la - lb;
        return (a.userName || '').localeCompare(b.userName || '', 'ko');
      });
  }, [allUsers, branches, currentWorkPlaceIdx, workerSearchTerm]);

  const handleAddOtherWorker = () => {
    const uid = toUserIdx(selectedOtherUserIdx);
    if (uid == null || uid === '') {
      alert('추가할 알바생을 선택해주세요.');
      return;
    }
    if (isOtherWorkerOnGrid(uid)) {
      alert('이미 목록에 추가된 알바생입니다.');
      return;
    }

    setAddedWorkerUserIdxs((prev) => [...prev, uid]);
    setFilterType('ALL');
    const currentWeekDays = Array.from({ length: 7 }).map((_, i) =>
      format(addDays(currentWeekStart, i), 'yyyy-MM-dd')
    );
    setEditSchedules((prev) => {
      const nextUser = { ...(prev[uid] || {}) };
      currentWeekDays.forEach((dt) => {
        if (!nextUser[dt] || nextUser[dt].length === 0) {
          nextUser[dt] = [createEmptyShift(uid, dt, currentWorkPlaceIdx, null)];
        }
      });
      return { ...prev, [uid]: nextUser };
    });
    setShowAddWorkerModal(false);
    setSelectedOtherUserIdx('');
    setWorkerSearchTerm('');
  };

  const handleRemoveOtherWorker = (u) => {
    if (!isOtherBranchWorker(u)) return;
    const uid = toUserIdx(u.userIdx || u.id);
    const adminOnly = !hasApplyAtHomeBranch(uid);

    if (adminOnly) {
      if (!window.confirm(`${u.userName}님을 목록에서 제거할까요?\n(신청 내역이 없어 행이 사라집니다)`)) return;
      setAddedWorkerUserIdxs((prev) => prev.filter((id) => toUserIdx(id) !== uid));
      setEditSchedules((prev) => {
        const next = { ...prev };
        delete next[uid];
        return next;
      });
      return;
    }

    if (!window.confirm(
      `${u.userName}님의 배정 내역을 초기화합니다.\n신청 내역은 유지되며, 배정 확정 시 미출근으로 처리됩니다.`
    )) return;

    // Keep row (has apply); reset cells to baseline
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

  /** 행(n)의 모든 요일 셀(y)에 동일 상태 일괄 적용. 미신청·빈 날은 제외. */
  const handleBulkUpdateRow = (userIdx, userName, val) => {
    if (!val) return;
    const uid = toUserIdx(userIdx);
    const userDays = editSchedules[uid] || {};
    let cellCount = 0;
    Object.values(userDays).forEach((shifts) => {
      cellCount += (shifts || []).length;
    });
    if (cellCount === 0) {
      alert(`${userName}님에게 적용할 칸이 없습니다.\n(미신청·빈 날은 일괄 대상이 아닙니다)`);
      return;
    }
    if (!window.confirm(
      `${userName}님 주간 ${cellCount}칸에 ${val}을(를) 일괄 적용할까요?`
    )) return;

    const isOff = val === '미출근';
    const isOpen = val === '오픈';
    const isClose = val === '마감';
    setEditSchedules((prev) => {
      const userDaysPrev = prev[uid];
      if (!userDaysPrev) return prev;
      const nextDays = {};
      Object.keys(userDaysPrev).forEach((dt) => {
        nextDays[dt] = (userDaysPrev[dt] || []).map((s) => {
          if (isOff) {
            return {
              ...s,
              wsdStartTime: '',
              wsdStatus: '미출근',
              wsdIsOpen: false,
              wsdIsClose: false,
              wsdIsConfirmed: false,
            };
          }
          if (isOpen) {
            return {
              ...s,
              wsdStartTime: openStartTimeForDate(dt),
              wsdStatus: '출근',
              wsdIsOpen: true,
              wsdIsClose: false,
              wsdIsConfirmed: false,
            };
          }
          if (isClose) {
            return {
              ...s,
              wsdStartTime: s.wsdStartTime || '',
              wsdStatus: '출근',
              wsdIsOpen: false,
              wsdIsClose: true,
              wsdIsConfirmed: false,
            };
          }
          // 일반 시간 선택 시: 오픈 및 마감 모두 체크 해제
          return {
            ...s,
            wsdStartTime: val,
            wsdStatus: '출근',
            wsdIsOpen: false,
            wsdIsClose: false,
            wsdIsConfirmed: false,
          };
        });
      });
      return { ...prev, [uid]: nextDays };
    });
  };

  const renderRowBulkInput = (u) => {
    const uid = toUserIdx(u.userIdx);
    return (
      <AssignTimeInput
        variant="button"
        buttonLabel="일괄"
        value=""
        title="이 행 전체에 같은 상태 적용"
        className="wat-bulk-btn"
        minListWidth={112}
        options={BULK_LIST_OPTIONS}
        onPick={(val) => handleBulkUpdateRow(uid, u.userName, val)}
      />
    );
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
      DRAFT: { confirm: "임시 저장하시겠습니까?\n(아직 알바생들에게 공개되지 않습니다)", done: "임시 저장이 완료되었습니다." },
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
            isOpen: shift.wsdIsOpen || false,
            isClose: shift.wsdIsClose || false,
            wsdIsOpen: shift.wsdIsOpen || false,
            wsdIsClose: shift.wsdIsClose || false
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
          isOpen: false,
          isClose: false,
          wsdIsOpen: false,
          wsdIsClose: false
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
        <div className="wat-shift-top d-flex align-items-center justify-content-between" data-html2canvas-ignore="true">
          <div className="d-flex align-items-center gap-2">
            <Form.Check
              type="checkbox"
              id={`open-${shift._id}`}
              checked={!!shift.wsdIsOpen}
              onChange={(e) => {
                const checked = e.target.checked;
                handleUpdateShift(uid, dateStr, shift._id, {
                  wsdIsOpen: checked,
                  ...(checked ? {
                    wsdStatus: '출근',
                    wsdStartTime: shift.wsdStartTime || openStartTimeForDate(dateStr)
                  } : {})
                });
              }}
              label="오픈"
              title={openHint ? '오픈으로 신청됨 — 체크하면 오픈 출근' : undefined}
              className={`wat-open-check ${shift.wsdIsOpen ? 'is-on' : ''} ${openHint ? 'is-hint' : ''}`}
            />
            <Form.Check
              type="checkbox"
              id={`close-${shift._id}`}
              checked={!!shift.wsdIsClose}
              onChange={(e) => {
                const checked = e.target.checked;
                handleUpdateShift(uid, dateStr, shift._id, {
                  wsdIsClose: checked,
                  ...(checked ? { wsdStatus: '출근' } : {})
                });
              }}
              label="마감"
              className={`wat-close-check ${shift.wsdIsClose ? 'is-on' : ''}`}
            />
          </div>
          {canResetShift(shift) && (
            <Button
              variant="link"
              size="sm"
              className="wat-icon-btn p-0 text-muted ms-auto"
              title="되돌리기"
              aria-label="되돌리기"
              onClick={() => handleRemoveShift(uid, dateStr, shift._id)}
            >
              <RiRefreshLine size={13} />
            </Button>
          )}
        </div>
        <AssignTimeInput
          value={shift.wsdStartTime || ''}
          placeholder={displayShiftStatus(shift)}
          className={`wat-shift-input assign-status-input ${getShiftTone(shift)}`}
          onPick={(val) => {
            if (val === '미출근') {
              handleUpdateShift(uid, dateStr, shift._id, {
                wsdStartTime: '',
                wsdStatus: '미출근',
                wsdIsOpen: false,
                wsdIsClose: false
              });
            } else if (val === '오픈') {
              handleUpdateShift(uid, dateStr, shift._id, {
                wsdStartTime: openStartTimeForDate(dateStr),
                wsdStatus: '출근',
                wsdIsOpen: true
              });
            } else if (!val) {
              handleUpdateShift(uid, dateStr, shift._id, {
                wsdStartTime: '',
                wsdStatus: null,
                wsdIsOpen: false,
                wsdIsClose: false
              });
            } else {
              handleUpdateShift(uid, dateStr, shift._id, {
                wsdStartTime: val,
                wsdStatus: '출근'
              });
            }
          }}
        />
      </div>
    );
  };

  const renderDayCell = (uid, dateStr) => {
    let dayShifts = editSchedules[uid]?.[dateStr] || [];
    if (dayShifts.length === 0) {
      dayShifts = [createEmptyShift(uid, dateStr, currentWorkPlaceIdx, null)];
    }
    return (
      <>
        {dayShifts.map(shift => renderShiftBlock(uid, dateStr, shift))}
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
        >
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 d-inline-flex align-items-center gap-1"
            onClick={() => setShowGuideModal(true)}
          >
            <RiQuestionLine size={16} />
            사용 방법
          </Button>
        </PageHeader>

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

          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="wat-toolbar-day-filter align-items-center gap-1">
              <span className="small fw-bold text-muted me-1">요일:</span>
              <SegmentedFilter
                options={DAY_FILTER_OPTIONS.map(f => ({ value: f.value, label: f.name }))}
                value={dayFilter}
                onChange={setDayFilter}
              />
            </div>
            <div className="d-flex align-items-center gap-1">
              <span className="small fw-bold text-muted me-1">출퇴근:</span>
              <SegmentedFilter
                options={FILTERS.map(f => ({ value: f.value, label: f.name }))}
                value={filterType}
                onChange={setFilterType}
              />
            </div>
          </div>
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
                const applied = appliedCountByDate[dateStr] || 0;
                const isDayFiltered = dayFilter !== 'ALL' && Number(dayFilter) === idx;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    className={`wat-day-tab ${mobileDayIdx === idx ? 'active' : ''} ${isHoly ? 'is-holy' : ''} ${isSat ? 'is-sat' : ''} ${isDayFiltered ? 'wat-tab-filtered' : ''}`}
                    onClick={() => setMobileDayIdx(idx)}
                  >
                    <div className="wat-tab-day-name">{'월화수목금토일'[idx]}</div>
                    <div className="wat-tab-date">{format(date, 'MM/dd')}</div>
                    <div className="wat-tab-chips">
                      <span className={`wat-apply-chip ${applied === 0 ? 'is-zero' : ''}`}>신{applied}</span>
                      <span className={`wat-peak-chip ${peak === 0 ? 'is-zero' : ''}`}>P{peak}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="wat-mobile-list" data-html2canvas-ignore="true">
              {renderUsers.map(u => {
                const uid = toUserIdx(u.userIdx);
                const userRemark = schedules.find(s => toUserIdx(s.userIdx) === uid && s.wsdRemarks)?.wsdRemarks || '';
                const other = isOtherBranchWorker(u);
                const onLeave = isOnLeave(u);
                const dayShifts = editSchedules[uid]?.[mobileDateStr] || [];
                const firstShift = dayShifts[0];
                const hadApply = firstShift ? !!(firstShift.originHadApply || firstShift.wsdStatus === '신청') : false;
                const openApply = firstShift ? !!firstShift.originOpenApplied : false;
                return (
                  <div key={uid} className={`wat-mobile-card${onLeave ? ' is-leave' : ''}`}>
                    <div className="wat-mobile-card-head">
                      <div className="wat-worker-info">
                        <div className="wat-worker-title-row">
                          <span className="wat-worker-name">{u.userName}</span>
                          {Number(u.nameSeq) > 1 && u.userIdx != null && (
                            <Badge bg="secondary" className="align-middle">#{u.userIdx}</Badge>
                          )}
                          {onLeave && (
                            <Badge bg="warning" text="dark" className="align-middle">휴직</Badge>
                          )}
                          {other && (
                            <Badge bg="secondary" className="align-middle">{u.workPlaceName || '타 지점'}</Badge>
                          )}
                          {openApply ? (
                            <span className="wat-badge-applied-open">오픈 신청</span>
                          ) : hadApply ? (
                            <span className="wat-badge-applied">신청</span>
                          ) : (
                            <span className="wat-badge-unapplied">미신청</span>
                          )}
                        </div>
                      </div>
                      <div className="wat-mobile-card-actions">
                        {renderRowBulkInput(u)}
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
                    </div>
                    <div className="wat-mobile-card-body">
                      {renderDayCell(uid, mobileDateStr)}
                    </div>
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
                      {weekDays.map((date, idx) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const { isHoly, isSat } = dayMeta(date);
                        const peak = peakByDate[dateStr] || 0;
                        const applied = appliedCountByDate[dateStr] || 0;
                        const isColHighlighted = dayFilter !== 'ALL' && Number(dayFilter) === idx;
                        return (
                          <th
                            key={dateStr}
                            className={`wat-day-head ${isHoly ? 'is-holy' : ''} ${isSat ? 'is-sat' : ''} ${isColHighlighted ? 'wat-col-highlighted' : ''}`}
                          >
                            <div>{format(date, 'MM/dd')}</div>
                            <div className="small fw-normal">{'일월화수목금토'[getDay(date)]}요일</div>
                            <div className="wat-head-chips">
                              <span className={`wat-apply-chip ${applied === 0 ? 'is-zero' : ''}`} title="해당 요일 신청 인원">
                                신청 {applied}
                              </span>
                              <span className={`wat-peak-chip ${peak === 0 ? 'is-zero' : ''}`} title="해당 요일 피크 동시 근무자 수">
                                피크 {peak}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                      <th className="wat-remarks-head text-center" style={{ minWidth: '130px', verticalAlign: 'middle' }}>
                        비고
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderUsers.map(u => {
                      const uid = toUserIdx(u.userIdx);
                      const userRemark = schedules.find(s => toUserIdx(s.userIdx) === uid && s.wsdRemarks)?.wsdRemarks || '';
                      const other = isOtherBranchWorker(u);
                      const onLeave = isOnLeave(u);
                      return (
                        <tr key={uid} className={onLeave ? 'wat-row-leave' : undefined}>
                          <td className="wat-sticky-col">
                            <div className="wat-worker-head">
                              <div className="wat-worker-info">
                                <div className="wat-worker-name">
                                  {u.userName}
                                  {Number(u.nameSeq) > 1 && u.userIdx != null && (
                                    <Badge bg="secondary" className="ms-1 align-middle">#{u.userIdx}</Badge>
                                  )}
                                  {onLeave && (
                                    <Badge bg="warning" text="dark" className="ms-1 align-middle">휴직</Badge>
                                  )}
                                </div>
                                <div className="wat-worker-meta">
                                  {other && (
                                    <Badge bg="secondary" className="mb-1">{u.workPlaceName || '타 지점'}</Badge>
                                  )}
                                </div>
                                {renderRowBulkInput(u)}
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
                          {weekDays.map((date, idx) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const isColHighlighted = dayFilter !== 'ALL' && Number(dayFilter) === idx;
                            return (
                              <td key={dateStr} className={`wat-cell ${isColHighlighted ? 'wat-col-highlighted' : ''}`}>
                                {renderDayCell(uid, dateStr)}
                              </td>
                            );
                          })}
                          <td className="wat-cell wat-cell-remarks" style={{ verticalAlign: 'middle', fontSize: '0.85rem' }}>
                            <RemarkCell
                              text={userRemark}
                              userName={u.userName}
                              onOpen={(name, text) => setRemarkModal({ show: true, userName: name, text })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {renderUsers.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-5">
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
          right={
            <>
              <Button variant="success" onClick={handleDownloadExcel} disabled={excelDownloading || loading}>
                {excelDownloading ? <Spinner size="sm" className="me-1" /> : <RiDownload2Line className="me-1" />}
                엑셀
              </Button>
              <Button variant="outline-primary" onClick={() => {
                setSelectedOtherUserIdx('');
                setWorkerSearchTerm('');
                setShowAddWorkerModal(true);
              }}>
                <RiUserAddLine className="me-1" /> 타지점
              </Button>
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
              {otherBranchCandidates.map(u => {
                const uid = toUserIdx(u.userIdx || u.id);
                const already = isOtherWorkerOnGrid(uid);
                const selected = !already && toUserIdx(selectedOtherUserIdx) === uid;
                const onLeave = isOnLeave(u);
                return (
                  <div
                    key={uid}
                    className={`p-2 border rounded-2 d-flex justify-content-between align-items-center ${selected ? 'border-primary bg-primary bg-opacity-10' : ''} ${already || onLeave ? 'opacity-75' : ''}`}
                    onClick={() => {
                      if (already) return;
                      setSelectedOtherUserIdx(uid);
                    }}
                    style={{ cursor: already ? 'default' : 'pointer' }}
                  >
                    <div>
                      <span className="fw-bold">{u.userName}</span>
                      {Number(u.nameSeq) > 1 && (u.userIdx != null || u.id != null) && (
                        <Badge bg="secondary" className="ms-1">#{u.userIdx ?? u.id}</Badge>
                      )}
                      <Badge bg="secondary" className="ms-2">{u.workPlaceName || '지점 미상'}</Badge>
                      {onLeave && (
                        <Badge bg="warning" text="dark" className="ms-1">휴직</Badge>
                      )}
                    </div>
                    {already ? (
                      <Badge bg="success">추가됨</Badge>
                    ) : (
                      selected && <RiAddLine className="text-primary" />
                    )}
                  </div>
                );
              })}
              {otherBranchCandidates.length === 0 && (
                <div className="text-center text-muted small py-3">해당하는 알바생이 없습니다.</div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={() => setShowAddWorkerModal(false)}>취소</Button>
            <Button variant="primary" onClick={handleAddOtherWorker}>
              추가하기
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={showGuideModal}
          onHide={() => setShowGuideModal(false)}
          centered
          size="lg"
          scrollable
        >
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold fs-5 d-flex align-items-center gap-2">
              <RiQuestionLine size={20} className="text-primary" />
              주간 스케줄 배정 사용 방법
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="wat-guide-body">
            <div className="wat-guide">
              <div className="wat-guide-alert">
                <div className="wat-guide-alert-title">한눈에 보기</div>
                <p className="mb-0 small">
                  지점·주차를 고른 뒤 셀에서 출근 시간과 오픈을 맞추고, 하단의 <strong>임시 저장 → 임시 배정 → 배정 확정</strong> 순으로 저장하세요.
                  알바생에게 최종 공개되는 것은 <strong>배정 확정</strong>(또는 임시 배정의 출근 셀)입니다.
                </p>
              </div>

              <h6 className="wat-guide-title">1. 화면 구성</h6>
              <ul className="wat-guide-list">
                <li><strong>지점 선택:</strong> 배정할 매장을 고릅니다.</li>
                <li><strong>주차 이동:</strong> 화살표·날짜 선택·이번 주로 주를 바꿉니다.</li>
                <li><strong>필터:</strong> 전체 / 출근 / 미출근으로 행을 좁혀 봅니다.</li>
                <li><strong>상태 칩:</strong> 배정 전 · 임시 저장 · 임시 배정 · 확정 — 현재 주의 공개 상태를 나타냅니다.</li>
                <li><strong>피크(P):</strong> 해당 날짜에 출근으로 잡힌 인원 수입니다.</li>
              </ul>

              <h6 className="wat-guide-title">2. 셀 상태 의미</h6>
              <ul className="wat-guide-list">
                <li><strong>미신청:</strong> 알바생이 아직 신청하지 않았고, 배정도 없는 날입니다.</li>
                <li><strong>신청:</strong> 알바생이 근무를 신청한 상태입니다. 아직 출근으로 확정되지 않았습니다.</li>
                <li><strong>신청 · 오픈:</strong> 오픈으로 신청했으나, 아직 오픈 출근 체크가 안 된 상태입니다.</li>
                <li><strong>출근:</strong> 시간과 오픈을 맞춰 배정한 상태입니다.</li>
                <li><strong>미출근:</strong> 신청은 있었으나 최종적으로 출근하지 않는 날로 처리된 상태입니다.</li>
              </ul>

              <h6 className="wat-guide-title">3. 배정하는 방법</h6>
              <ul className="wat-guide-list">
                <li>출근 시간을 입력하거나 <strong>오픈</strong>을 체크하면 해당 셀이 출근 배정으로 잡힙니다. 오픈을 켜면 시작 시간은 자동으로 맞춰지고 수동 수정은 잠깁니다.</li>
                <li><strong>일괄:</strong> 알바생 이름 아래 작은 버튼으로 그 행의 신청·배정 칸에 같은 상태(오픈 · 미출근 · 출근 시간)를 한꺼번에 넣을 수 있습니다. 칸별 수정은 그대로 가능하며, 미신청·빈 날은 대상에서 제외됩니다.</li>
                <li>잘못 고친 셀은 초기화(되돌리기) 버튼으로 원래 신청/배정 상태로 되돌릴 수 있습니다. 신청 내역 자체는 유지됩니다.</li>
              </ul>

              <h6 className="wat-guide-title">4. 저장 3모드 (가장 중요)</h6>
              <ul className="wat-guide-list">
                <li>
                  <strong>임시 저장:</strong> 작업 내용을 서버에만 저장합니다.
                  알바생에게는 <strong>공개되지 않습니다</strong>. 신청 셀은 그대로 둡니다.
                </li>
                <li>
                  <strong>임시 배정:</strong> 이미 출근으로 맞춘 날만 알바생에게 공개합니다.
                  아직 안 맞춘 신청 날은 <strong>신청 상태 그대로</strong> 유지됩니다.
                </li>
                <li>
                  <strong>배정 확정:</strong> 해당 주를 최종 확정합니다.
                  출근으로 맞춘 날은 공개되고, <strong>남은 신청은 미출근으로 바뀝니다</strong>.
                </li>
              </ul>
              <p className="wat-guide-note small mb-3">
                권장 순서: 임시 저장으로 초안 다듬기 → 일부만 먼저 공개할 때 임시 배정 → 주간 마감 시 배정 확정.
              </p>

              <h6 className="wat-guide-title">5. 타 지점 · 엑셀</h6>
              <ul className="wat-guide-list mb-0">
                <li><strong>타지점:</strong> 다른 매장 알바생을 이번 주 그리드에 추가해 파견 배정할 수 있습니다.</li>
                <li><strong>타지점 행 초기화:</strong> 타지점 알바생 행의 × 버튼으로 처리합니다. 신청이 있으면 배정만 되돌리고 행은 남고, 관리자가 넣기만 한 경우(신청 없음)는 목록에서 제거됩니다.</li>
                <li><strong>엑셀:</strong> 현재 화면의 주간 배정표를 다운로드합니다. (엑셀 파일은 클릭 시 별도로 로드됩니다.)</li>
              </ul>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button
              variant="primary"
              size="sm"
              className="rounded-pill px-4 fw-bold"
              onClick={() => setShowGuideModal(false)}
            >
              확인
            </Button>
          </Modal.Footer>
        </Modal>

        {/* 비고 전문 확인 모달 */}
        <Modal
          show={remarkModal.show}
          onHide={() => setRemarkModal({ show: false, userName: '', text: '' })}
          centered
          className="wat-remark-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title className="fs-6 fw-bold">
              {remarkModal.userName}님 비고
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="wat-remark-modal-body">
              {remarkModal.text}
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-pill px-3"
              onClick={() => setRemarkModal({ show: false, userName: '', text: '' })}
            >
              닫기
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
      {ExcelDownloadProgressModal}
    </div>
  );
};

export default AdminWeeklyAssign;
