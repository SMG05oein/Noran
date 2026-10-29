import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Container } from 'react-bootstrap';
import { fetchWorkRequests, saveWorkSchedules } from '../api/workApi';
import { fetchWorkPlaces, fetchAllUsers } from '../api/authApi';
import { addDays, format, startOfWeek, endOfWeek, subWeeks, addWeeks, parseISO } from 'date-fns';
import useAuthStore from '../store/useAuthStore';
import { countPeak } from '../utils/shiftPeak';
import { downloadWeeklyAssignExcel } from '../utils/weeklyAssignExcel';
import useSyncExcelDownloadProgress from '../hooks/useSyncExcelDownloadProgress';
import AssignTimeInput, { BULK_LIST_OPTIONS } from '../components/AssignTimeInput';
import { openStartTimeForDate, toDateStr, normalizeScheduleStatus, resolveOriginFlags, resetShiftFields, withBaseline } from '../utils/shiftReset';
import Loading from '../components/Loading';

import { toUserIdx, createEmptyShift } from '../components/weeklyAssign/weeklyAssignUtils';
import WeeklyAssignToolbar from '../components/weeklyAssign/WeeklyAssignToolbar';
import WeeklyAssignMobileView from '../components/weeklyAssign/WeeklyAssignMobileView';
import WeeklyAssignDesktopTable from '../components/weeklyAssign/WeeklyAssignDesktopTable';
import WeeklyAssignActionBar from '../components/weeklyAssign/WeeklyAssignActionBar';
import { AddOtherWorkerModal, GuideModal, RemarkDetailModal } from '../components/weeklyAssign/WeeklyAssignModals';
import { MobileMoreSheet, MobileTimeSheet } from '../components/weeklyAssign/WeeklyAssignSheets';

import './AdminMain.css';
import './AdminWeeklyAssign.css';

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
  const [onlyApplied, setOnlyApplied] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [mobileTimeSheet, setMobileTimeSheet] = useState({
    show: false,
    uid: null,
    userName: '',
    dateStr: '',
    shiftId: null
  });
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

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

  const totalByDate = useMemo(() => {
    const map = {};
    weekDays.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      let count = 0;
      Object.entries(editSchedules).forEach(([uid, userDays]) => {
        const dayShifts = userDays[dateStr] || [];
        const isAttending = dayShifts.some(s => {
          const wpIdx = s.wsdWorkPlaceIdx || currentWorkPlaceIdx;
          if (Number(wpIdx) !== Number(currentWorkPlaceIdx)) return false;
          return s.wsdStatus === '출근' || s.status === '출근' || (!['미출근', '신청', '미신청', '미배정'].includes(s.wsdStatus) && (s.wsdIsOpen || s.wsdIsClose || (s.wsdStartTime && s.wsdStartTime !== '미출근')));
        });
        if (isAttending) count++;
      });
      map[dateStr] = count;
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

  const baseWorkers = useMemo(() => {
    return allUsers.filter(u => {
      if (!isActiveWorker(u)) return false;
      const uid = toUserIdx(u.userIdx || u.id);
      const wpIdx = resolveUserHomeWpIdx(u);
      const isHome = Number(wpIdx) === Number(currentWorkPlaceIdx);
      const hasScheduleForHome = hasHomeBranchSchedule(uid);
      const isAdded = addedWorkerUserIdxs.some((id) => toUserIdx(id) === uid);
      return isHome || hasScheduleForHome || isAdded;
    });
  }, [allUsers, currentWorkPlaceIdx, addedWorkerUserIdxs, branches, editSchedules]);

  const sortWorkers = (list) => {
    return [...list].sort((a, b) => {
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
  };

  const renderUsers = useMemo(() => {
    let usersToShow = baseWorkers;

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

    return sortWorkers(usersToShow);
  }, [baseWorkers, editSchedules, filterType, dayFilter, weekDays]);

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
      if ('wsdStartTime' in patch || 'wsdStatus' in patch || 'wsdIsOpen' in patch) {
        nextShift.wsdIsConfirmed = false;
      }
      arr[idx] = nextShift;
      nextUser[dateStr] = arr;
      return { ...prev, [uid]: nextUser };
    });
  };

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
    const pendingOff = [];

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
            isConfirmed: (mode === 'PARTIAL' || mode === 'CONFIRM') && status === '출근',
            isOpen: shift.wsdIsOpen || false,
            isClose: shift.wsdIsClose || false,
            wsdIsOpen: shift.wsdIsOpen || false,
            wsdIsClose: shift.wsdIsClose || false
          });
        });
      });
    });

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

  const mobileDate = weekDays[mobileDayIdx] || weekDays[0];
  const mobileDateStr = mobileDate ? format(mobileDate, 'yyyy-MM-dd') : '';

  const mobileDisplayUsers = useMemo(() => {
    let list = baseWorkers;

    if (filterType !== 'ALL' && mobileDateStr) {
      list = list.filter(u => {
        const uid = toUserIdx(u.userIdx || u.id);
        const dayShifts = editSchedules[uid]?.[mobileDateStr] || [];
        const isAttendingOnDay = dayShifts.some(s => s.wsdStatus === '출근' || s.status === '출근');

        if (filterType === 'ATTENDING') return isAttendingOnDay;
        if (filterType === 'NOT_ATTENDING') return !isAttendingOnDay;
        return true;
      });
    }

    if (onlyApplied && mobileDateStr) {
      list = list.filter(u => {
        const uid = toUserIdx(u.userIdx || u.id);
        const dayShifts = editSchedules[uid]?.[mobileDateStr] || [];
        const firstShift = dayShifts[0];
        if (!firstShift) return false;
        const hadApply = !!(firstShift.originHadApply || firstShift.wsdStatus === '신청' || firstShift.originOpenApplied);
        const isAttending = firstShift.wsdStatus === '출근' || !!firstShift.wsdStartTime || !!firstShift.wsdIsOpen || !!firstShift.wsdIsClose;
        return hadApply || isAttending;
      });
    }

    return sortWorkers(list);
  }, [baseWorkers, editSchedules, mobileDateStr, filterType, onlyApplied]);

  const activeSheetShift = useMemo(() => {
    if (!mobileTimeSheet.show || !mobileTimeSheet.uid) return null;
    const userShifts = editSchedules[mobileTimeSheet.uid]?.[mobileTimeSheet.dateStr] || [];
    return userShifts.find(s => s._id === mobileTimeSheet.shiftId) || userShifts[0] || null;
  }, [mobileTimeSheet, editSchedules]);

  return (
    <div className="admin-container ui-page wat-page">
      <Container fluid className="px-3 px-md-4 py-3">
        <WeeklyAssignToolbar
          weekAssignStatus={weekAssignStatus}
          onOpenGuide={() => setShowGuideModal(true)}
          branches={branches}
          selectedWpIdx={selectedWpIdx}
          setSelectedWpIdx={setSelectedWpIdx}
          currentWeekStart={currentWeekStart}
          isThisWeek={isThisWeek}
          handlePickWeekDate={handlePickWeekDate}
          handlePrevWeek={handlePrevWeek}
          handleNextWeek={handleNextWeek}
          handleGoThisWeek={handleGoThisWeek}
          dayFilter={dayFilter}
          setDayFilter={setDayFilter}
          filterType={filterType}
          setFilterType={setFilterType}
          onlyApplied={onlyApplied}
          setOnlyApplied={setOnlyApplied}
        />

        {loading ? <Loading /> : (
          <>
            <WeeklyAssignMobileView
              weekDays={weekDays}
              mobileDayIdx={mobileDayIdx}
              setMobileDayIdx={setMobileDayIdx}
              peakByDate={peakByDate}
              appliedCountByDate={appliedCountByDate}
              totalByDate={totalByDate}
              dayFilter={dayFilter}
              mobileDateStr={mobileDateStr}
              mobileDisplayUsers={mobileDisplayUsers}
              schedules={schedules}
              editSchedules={editSchedules}
              currentWorkPlaceIdx={currentWorkPlaceIdx}
              isOtherBranchWorker={isOtherBranchWorker}
              isOnLeave={isOnLeave}
              renderRowBulkInput={renderRowBulkInput}
              handleRemoveOtherWorker={handleRemoveOtherWorker}
              handleUpdateShift={handleUpdateShift}
              handleRemoveShift={handleRemoveShift}
              setRemarkModal={setRemarkModal}
              setMobileTimeSheet={setMobileTimeSheet}
              onlyApplied={onlyApplied}
              touchStartX={touchStartX}
              touchStartY={touchStartY}
            />

            <WeeklyAssignDesktopTable
              weekDays={weekDays}
              renderUsers={renderUsers}
              schedules={schedules}
              editSchedules={editSchedules}
              currentWorkPlaceIdx={currentWorkPlaceIdx}
              peakByDate={peakByDate}
              appliedCountByDate={appliedCountByDate}
              totalByDate={totalByDate}
              dayFilter={dayFilter}
              isOtherBranchWorker={isOtherBranchWorker}
              isOnLeave={isOnLeave}
              renderRowBulkInput={renderRowBulkInput}
              handleRemoveOtherWorker={handleRemoveOtherWorker}
              handleUpdateShift={handleUpdateShift}
              handleRemoveShift={handleRemoveShift}
              onOpenRemarkModal={(userName, text) => setRemarkModal({ show: true, userName, text })}
            />
          </>
        )}

        <WeeklyAssignActionBar
          handleDownloadExcel={handleDownloadExcel}
          excelDownloading={excelDownloading}
          loading={loading}
          onOpenAddWorker={() => {
            setSelectedOtherUserIdx('');
            setWorkerSearchTerm('');
            setShowAddWorkerModal(true);
          }}
          handleSaveAll={handleSaveAll}
          saving={saving}
          onOpenMoreSheet={() => setShowMoreSheet(true)}
        />

        <AddOtherWorkerModal
          show={showAddWorkerModal}
          onHide={() => setShowAddWorkerModal(false)}
          workerSearchTerm={workerSearchTerm}
          setWorkerSearchTerm={setWorkerSearchTerm}
          otherBranchCandidates={otherBranchCandidates}
          isOtherWorkerOnGrid={isOtherWorkerOnGrid}
          selectedOtherUserIdx={selectedOtherUserIdx}
          setSelectedOtherUserIdx={setSelectedOtherUserIdx}
          isOnLeave={isOnLeave}
          onAdd={handleAddOtherWorker}
        />

        <GuideModal
          show={showGuideModal}
          onHide={() => setShowGuideModal(false)}
        />

        <RemarkDetailModal
          show={remarkModal.show}
          userName={remarkModal.userName}
          text={remarkModal.text}
          onHide={() => setRemarkModal({ show: false, userName: '', text: '' })}
        />

        <MobileMoreSheet
          show={showMoreSheet}
          onHide={() => setShowMoreSheet(false)}
          onDownloadExcel={handleDownloadExcel}
          onOpenAddWorker={() => {
            setSelectedOtherUserIdx('');
            setWorkerSearchTerm('');
            setShowAddWorkerModal(true);
          }}
          onSavePartial={() => handleSaveAll('PARTIAL')}
          onOpenGuide={() => setShowGuideModal(true)}
          excelDownloading={excelDownloading}
          saving={saving}
          loading={loading}
        />

        <MobileTimeSheet
          mobileTimeSheet={mobileTimeSheet}
          setMobileTimeSheet={setMobileTimeSheet}
          activeSheetShift={activeSheetShift}
          mobileDateStr={mobileDateStr}
          handleUpdateShift={handleUpdateShift}
        />
      </Container>
      {ExcelDownloadProgressModal}
    </div>
  );
};

export default AdminWeeklyAssign;
