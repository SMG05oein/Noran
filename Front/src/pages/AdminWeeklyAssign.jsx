import React, { useState, useEffect, useMemo } from 'react';
import { Container, Table, Button, Spinner, Form, Card, Modal, Badge } from 'react-bootstrap';
import { fetchWorkRequests, updateWorkRequest, createWorkRequest } from '../api/workApi';
import { fetchWorkPlaces, fetchAdminWorkers } from '../api/authApi';
import { addDays, format, startOfWeek, endOfWeek, subWeeks, addWeeks, getWeekOfMonth } from 'date-fns';
import useAuthStore from '../store/useAuthStore';
import { RiArrowLeftSLine, RiArrowRightSLine, RiDownload2Line, RiUserAddLine, RiDeleteBinLine, RiSearchLine } from 'react-icons/ri';
import './AdminMain.css';

const DAY_KEYS = [
  { key: 'wawIsMon', name: '월', offset: 0, timeKey: 'wawMonStartTime', wpIdxKey: 'wawMonWorkPlaceIdx', wpNameKey: 'wawMonWorkPlaceName' },
  { key: 'wawIsTue', name: '화', offset: 1, timeKey: 'wawTueStartTime', wpIdxKey: 'wawTueWorkPlaceIdx', wpNameKey: 'wawTueWorkPlaceName' },
  { key: 'wawIsWed', name: '수', offset: 2, timeKey: 'wawWedStartTime', wpIdxKey: 'wawWedWorkPlaceIdx', wpNameKey: 'wawWedWorkPlaceName' },
  { key: 'wawIsThu', name: '목', offset: 3, timeKey: 'wawThuStartTime', wpIdxKey: 'wawThuWorkPlaceIdx', wpNameKey: 'wawThuWorkPlaceName' },
  { key: 'wawIsFri', name: '금', offset: 4, timeKey: 'wawFriStartTime', wpIdxKey: 'wawFriWorkPlaceIdx', wpNameKey: 'wawFriWorkPlaceName' },
  { key: 'wawIsSat', name: '토', offset: 5, timeKey: 'wawSatStartTime', wpIdxKey: 'wawSatWorkPlaceIdx', wpNameKey: 'wawSatWorkPlaceName' },
  { key: 'wawIsSun', name: '일', offset: 6, timeKey: 'wawSunStartTime', wpIdxKey: 'wawSunWorkPlaceIdx', wpNameKey: 'wawSunWorkPlaceName' },
];

const TIME_OPTIONS = [];
for (let h = 10; h <= 23; h++) {
  const hour = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hour}:00`);
  if (h < 23) TIME_OPTIONS.push(`${hour}:30`);
}

const formatTimeValue = (timeStr) => {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
};

const AdminWeeklyAssign = () => {
  const { user } = useAuthStore();
  const [selectedWpIdx, setSelectedWpIdx] = useState(user?.workPlaceIdx || null);
  const [branches, setBranches] = useState([]);
  
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [workRequests, setWorkRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [addedWorkerUserIdxs, setAddedWorkerUserIdxs] = useState([]);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [selectedOtherUserIdx, setSelectedOtherUserIdx] = useState('');
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentBranchObj = useMemo(() => {
    if (branches.length === 0) return null;
    return branches.find(b => Number(b.wpIdx) === Number(selectedWpIdx)) || branches[0];
  }, [branches, selectedWpIdx]);

  const currentWorkPlaceIdx = currentBranchObj?.wpIdx || user?.workPlaceIdx || 1;
  const selectedBranchName = currentBranchObj?.wpName || user?.workPlaceName || user?.branch || '지점';

  const loadData = async () => {
    setLoading(true);
    const dateStr = format(currentWeekStart, 'yyyy-MM-dd');
    const [reqRes, branchRes, workerRes] = await Promise.all([
      fetchWorkRequests(dateStr, currentWorkPlaceIdx),
      fetchWorkPlaces(),
      fetchAdminWorkers({ size: 100, page: 0, showInactive: false })
    ]);
    
    if (branchRes.success && branchRes.data) {
      setBranches(branchRes.data);
      const userWpName = user?.workPlaceName || user?.branch;
      const myBranch = branchRes.data.find(b => 
        (user?.workPlaceIdx && Number(b.wpIdx) === Number(user.workPlaceIdx)) ||
        (userWpName && (b.wpName === userWpName || userWpName.includes(b.wpName) || b.wpName.includes(userWpName)))
      );
      if (myBranch && !selectedWpIdx) {
        setSelectedWpIdx(myBranch.wpIdx);
      } else if (!selectedWpIdx || !branchRes.data.some(b => Number(b.wpIdx) === Number(selectedWpIdx))) {
        setSelectedWpIdx(myBranch?.wpIdx || branchRes.data[0]?.wpIdx || null);
      }
    }

    if (reqRes.success) setWorkRequests(reqRes.data || []);
    if (workerRes.success) {
      const list = workerRes.data?.content || (Array.isArray(workerRes.data) ? workerRes.data : []);
      setAllUsers(list);
    }
    setLoading(false);
  };

  useEffect(() => { 
    setAddedWorkerUserIdxs([]);
    loadData(); 
  }, [currentWeekStart, selectedWpIdx]);

  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));

  const weeklyRequests = useMemo(() => {
    return workRequests.filter(req => {
      const isHomeBranch = req.workPlaceIdx != null 
        ? Number(req.workPlaceIdx) === Number(currentWorkPlaceIdx)
        : (req.workPlaceName && req.workPlaceName === selectedBranchName);
      const hasAssignedInThisBranch = DAY_KEYS.some(d => Number(req[d.wpIdxKey]) === Number(currentWorkPlaceIdx) && req[d.timeKey]);
      const isExplicitlyAdded = addedWorkerUserIdxs.includes(req.userIdx);
      return isHomeBranch || hasAssignedInThisBranch || isExplicitlyAdded;
    });
  }, [workRequests, selectedBranchName, addedWorkerUserIdxs, currentWorkPlaceIdx]);

  const otherBranchUsers = useMemo(() => {
    const currentTableUserIdxs = new Set(weeklyRequests.map(r => r.userIdx));
    return allUsers.filter(u => !currentTableUserIdxs.has(u.userIdx));
  }, [allUsers, weeklyRequests]);

  const filteredOtherBranchUsers = useMemo(() => {
    if (!workerSearchTerm.trim()) return otherBranchUsers;
    const term = workerSearchTerm.trim().toLowerCase();
    return otherBranchUsers.filter(u => 
      (u.userName && u.userName.toLowerCase().includes(term)) ||
      (u.workPlaceName && u.workPlaceName.toLowerCase().includes(term)) ||
      (u.userId && u.userId.toLowerCase().includes(term)) ||
      (u.userPhone && u.userPhone.includes(term))
    );
  }, [otherBranchUsers, workerSearchTerm]);

  const handleAddOtherWorker = async () => {
    if (!selectedOtherUserIdx) return;
    const targetUser = allUsers.find(u => String(u.userIdx) === String(selectedOtherUserIdx));
    if (!targetUser) return;

    const existingReq = workRequests.find(r => Number(r.userIdx) === Number(targetUser.userIdx));

    if (!existingReq) {
      const dateStr = format(currentWeekStart, 'yyyy-MM-dd');
      const allReqRes = await fetchWorkRequests(dateStr);
      let foundServerReq = null;
      if (allReqRes.success && Array.isArray(allReqRes.data)) {
        foundServerReq = allReqRes.data.find(r => Number(r.userIdx) === Number(targetUser.userIdx));
      }

      if (foundServerReq) {
        setWorkRequests(prev => [foundServerReq, ...prev.filter(r => Number(r.userIdx) !== Number(targetUser.userIdx))]);
      } else {
        const newSkeleton = {
          wawIdx: null,
          userIdx: targetUser.userIdx,
          userName: targetUser.userName,
          workPlaceName: targetUser.workPlaceName || '타지점',
          workPlaceIdx: targetUser.workPlaceIdx || null,
          wawDate: format(currentWeekStart, 'yyyy-MM-dd'),
          wawIsMon: '미신청', wawIsTue: '미신청', wawIsWed: '미신청',
          wawIsThu: '미신청', wawIsFri: '미신청', wawIsSat: '미신청', wawIsSun: '미신청',
          wawMonStartTime: null, wawTueStartTime: null, wawWedStartTime: null,
          wawThuStartTime: null, wawFriStartTime: null, wawSatStartTime: null,
          wawSunStartTime: null,
          wawMonWorkPlaceIdx: null, wawTueWorkPlaceIdx: null, wawWedWorkPlaceIdx: null,
          wawThuWorkPlaceIdx: null, wawFriWorkPlaceIdx: null, wawSatWorkPlaceIdx: null,
          wawSunWorkPlaceIdx: null,
          wawRemarks: ''
        };
        setWorkRequests(prev => [newSkeleton, ...prev]);
      }
    }
    setAddedWorkerUserIdxs(prev => [...new Set([...prev, targetUser.userIdx])]);
    setSelectedOtherUserIdx('');
    setShowAddWorkerModal(false);
  };

  const handleRemoveOtherBranchWorker = async (req) => {
    const workerName = req.userName || `사원(${req.userIdx})`;
    const isConfirmed = window.confirm(
      `${workerName} 님의 현재 지점(${selectedBranchName}) 배정 내역을 삭제하고 목록에서 제외하시겠습니까?\n\n※ 원래 소속 지점의 근무 내역은 안전하게 보존됩니다.`
    );
    if (!isConfirmed) return;

    // 현재 지점(currentWorkPlaceIdx)에 배정된 요일들만 '미신청'/null로 초기화
    const updatedPayload = {
      wawDate: req.wawDate || format(currentWeekStart, 'yyyy-MM-dd'),
      wawIsMon: req.wawIsMon || '미신청',
      wawIsTue: req.wawIsTue || '미신청',
      wawIsWed: req.wawIsWed || '미신청',
      wawIsThu: req.wawIsThu || '미신청',
      wawIsFri: req.wawIsFri || '미신청',
      wawIsSat: req.wawIsSat || '미신청',
      wawIsSun: req.wawIsSun || '미신청',
      wawMonStartTime: req.wawMonStartTime || null,
      wawTueStartTime: req.wawTueStartTime || null,
      wawWedStartTime: req.wawWedStartTime || null,
      wawThuStartTime: req.wawThuStartTime || null,
      wawFriStartTime: req.wawFriStartTime || null,
      wawSatStartTime: req.wawSatStartTime || null,
      wawSunStartTime: req.wawSunStartTime || null,
      wawMonWorkPlaceIdx: req.wawMonWorkPlaceIdx || null,
      wawTueWorkPlaceIdx: req.wawTueWorkPlaceIdx || null,
      wawWedWorkPlaceIdx: req.wawWedWorkPlaceIdx || null,
      wawThuWorkPlaceIdx: req.wawThuWorkPlaceIdx || null,
      wawFriWorkPlaceIdx: req.wawFriWorkPlaceIdx || null,
      wawSatWorkPlaceIdx: req.wawSatWorkPlaceIdx || null,
      wawSunWorkPlaceIdx: req.wawSunWorkPlaceIdx || null,
      wawRemarks: req.wawRemarks || '',
      userIdx: req.userIdx
    };

    DAY_KEYS.forEach(d => {
      const dayWpIdx = req[d.wpIdxKey];
      if (Number(dayWpIdx) === Number(currentWorkPlaceIdx)) {
        updatedPayload[d.key] = '미신청';
        updatedPayload[d.timeKey] = null;
        updatedPayload[d.wpIdxKey] = null;
      }
    });

    let targetWawIdx = req.wawIdx;
    if (!targetWawIdx) {
      const dateStr = format(currentWeekStart, 'yyyy-MM-dd');
      const allReqRes = await fetchWorkRequests(dateStr);
      if (allReqRes.success && Array.isArray(allReqRes.data)) {
        const found = allReqRes.data.find(r => Number(r.userIdx) === Number(req.userIdx));
        if (found) targetWawIdx = found.wawIdx;
      }
    }

    if (targetWawIdx) {
      setSaving(true);
      const res = await updateWorkRequest(targetWawIdx, updatedPayload);
      setSaving(false);
      if (!res.success) {
        alert(res.error || '타 지점 배정 삭제에 실패했습니다.');
        return;
      }
    }

    setAddedWorkerUserIdxs(prev => prev.filter(id => id !== req.userIdx));
    setWorkRequests(prev => prev.map(r => {
      if (r.userIdx === req.userIdx) {
        const cleaned = { ...r };
        DAY_KEYS.forEach(d => {
          if (Number(r[d.wpIdxKey]) === Number(currentWorkPlaceIdx)) {
            cleaned[d.key] = '미신청';
            cleaned[d.timeKey] = null;
            cleaned[d.wpIdxKey] = null;
          }
        });
        return cleaned;
      }
      return r;
    }));

    await loadData();
  };

  const handleCellChange = (userIdx, statusKey, timeKey, wpIdxKey, val) => {
    setWorkRequests(prev => prev.map(req => {
      if (req.userIdx === userIdx) {
        if (val === '미배정') return { ...req, [statusKey]: '미배정', [timeKey]: null, [wpIdxKey]: null };
        if (val === '미신청') return { ...req, [statusKey]: '미신청', [timeKey]: null, [wpIdxKey]: null };
        if (val === '신청') return { ...req, [statusKey]: '신청', [timeKey]: null, [wpIdxKey]: null };
        return { ...req, [statusKey]: '배정', [timeKey]: val, [wpIdxKey]: currentWorkPlaceIdx };
      }
      return req;
    }));
  };

  const handleSaveAll = async (isConfirm = false) => {
    setSaving(true);
    const promises = [];
    const dateStr = format(currentWeekStart, 'yyyy-MM-dd');

    // 서버에 이미 생성되어 있는 주간 신청서(wawIdx) 최신 매핑 조회
    const allReqRes = await fetchWorkRequests(dateStr);
    const serverMap = new Map();
    if (allReqRes.success && Array.isArray(allReqRes.data)) {
      allReqRes.data.forEach(r => {
        if (r.userIdx) serverMap.set(Number(r.userIdx), r.wawIdx);
      });
    }

    weeklyRequests.forEach(req => {
      const hasAssignedTime = DAY_KEYS.some(d => req[d.timeKey] && String(req[d.timeKey]).trim() !== '');
      const hasApplicationHistory = DAY_KEYS.some(d => ['신청', '배정', '미배정', '타지점근무'].includes(req[d.key]));

      if (!hasAssignedTime && !hasApplicationHistory) return;

      const payload = {
        wawDate: req.wawDate || dateStr,
        wawIsMon: '미신청', wawIsTue: '미신청', wawIsWed: '미신청',
        wawIsThu: '미신청', wawIsFri: '미신청', wawIsSat: '미신청', wawIsSun: '미신청',
        wawMonStartTime: null, wawTueStartTime: null, wawWedStartTime: null,
        wawThuStartTime: null, wawFriStartTime: null, wawSatStartTime: null,
        wawSunStartTime: null,
        wawMonWorkPlaceIdx: null, wawTueWorkPlaceIdx: null, wawWedWorkPlaceIdx: null,
        wawThuWorkPlaceIdx: null, wawFriWorkPlaceIdx: null, wawSatWorkPlaceIdx: null,
        wawSunWorkPlaceIdx: null,
        wawRemarks: req.wawRemarks || '', 
        userIdx: req.userIdx || 1
      };

      let activeDaysCount = 0;
      DAY_KEYS.forEach(d => {
        const time = req[d.timeKey];
        const status = req[d.key];
        const dayWpIdx = req[d.wpIdxKey];

        const isOtherBranchShift = status === '타지점근무' || (dayWpIdx && Number(dayWpIdx) !== Number(currentWorkPlaceIdx) && (time || status === '배정'));

        if (isOtherBranchShift) {
          payload[d.key] = status === '타지점근무' ? '타지점근무' : '배정';
          payload[d.timeKey] = time || null;
          payload[d.wpIdxKey] = dayWpIdx;
          activeDaysCount++;
        } else if (time && String(time).trim() !== '' && status === '배정') {
          payload[d.key] = '배정';
          payload[d.timeKey] = time;
          payload[d.wpIdxKey] = currentWorkPlaceIdx;
          activeDaysCount++;
        } else if (status === '미배정') {
          payload[d.key] = '미배정';
          payload[d.timeKey] = null;
          payload[d.wpIdxKey] = null;
          activeDaysCount++;
        } else if (status === '신청') {
          payload[d.key] = isConfirm ? '미배정' : '신청';
          payload[d.timeKey] = null;
          payload[d.wpIdxKey] = null;
          activeDaysCount++;
        } else {
          payload[d.key] = '미신청';
          payload[d.timeKey] = null;
          payload[d.wpIdxKey] = null;
        }
      });

      if (activeDaysCount === 0) return;

      const effectiveWawIdx = req.wawIdx || serverMap.get(Number(req.userIdx));
      if (effectiveWawIdx != null) {
        promises.push(updateWorkRequest(effectiveWawIdx, payload));
      } else {
        promises.push(createWorkRequest(payload));
      }
    });

    if (promises.length > 0) {
      const results = await Promise.all(promises);
      if (results.every(r => r.success)) {
        alert(isConfirm ? "근무 배정이 확정되었습니다." : "근무 배정이 임시 저장되었습니다.");
        await loadData();
      } else {
        const firstError = results.find(r => !r.success)?.error || "일부 데이터를 저장하는 데 실패했습니다.";
        alert(firstError);
      }
    } else {
      alert("저장할 신청/배정 데이터가 없습니다.");
    }
    setSaving(false);
  };

  const getAssignedCount = (d) => {
    let count = 0;
    weeklyRequests.forEach(req => {
      const status = req[d.key];
      const time = formatTimeValue(req[d.timeKey]);
      const isOtherBranchShift = (status === '타지점근무' && Number(req[d.wpIdxKey]) !== Number(currentWorkPlaceIdx)) || 
                                 (req[d.wpIdxKey] && Number(req[d.wpIdxKey]) !== Number(currentWorkPlaceIdx) && (time || status === '배정'));
      
      if (!isOtherBranchShift && time) {
        count++;
      }
    });
    return count;
  };

  const handleDownloadImage = () => {
    if (weeklyRequests.length === 0) {
      alert('저장할 근무 배정 데이터가 없습니다.');
      return;
    }
    const canvas = document.createElement('canvas');
    const scale = 2;
    const width = 1100;
    const rowHeight = 44;
    const headerHeight = 130;
    const tableTop = headerHeight + 20;
    const tableHeaderH = 72;
    const tableHeight = tableHeaderH + (weeklyRequests.length * rowHeight);
    const height = tableTop + tableHeight + 60;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#1A1614';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#231D1A';
    ctx.strokeStyle = '#3D332D';
    ctx.beginPath();
    ctx.roundRect(30, 20, width - 60, height - 40, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#E8E3DF';
    ctx.font = 'bold 24px Pretendard, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🐷 ${selectedBranchName} 주간 근무 배정표`, 50, 60);
    ctx.fillStyle = '#A89F97';
    ctx.font = '14px Pretendard, sans-serif';
    const weekOfMonth = getWeekOfMonth(currentWeekStart);
    const weekPeriod = `${format(currentWeekStart, 'yyyy년 MM월 dd일')} ~ ${format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MM월 dd일')} (${format(currentWeekStart, 'MM월')} ${weekOfMonth}주차)`;
    ctx.fillText(`📅 기간: ${weekPeriod}`, 50, 90);
    ctx.textAlign = 'right';
    ctx.fillText(`생성일시: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, width - 50, 90);
    const colX = [45, 185, 309, 433, 557, 681, 805, 929, width - 45];
    
    // 테이블 배경 채우기 (헤더)
    ctx.fillStyle = '#332A25';
    ctx.fillRect(45, tableTop, width - 90, tableHeaderH);
    
    // 이름 헤더
    ctx.fillStyle = '#E8E3DF';
    ctx.font = 'bold 14px Pretendard, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('이름', colX[0] + 15, tableTop + tableHeaderH / 2 + 5);
    
    ctx.textAlign = 'center';
    DAY_KEYS.forEach((d, i) => {
      const cx = (colX[i + 1] + colX[i + 2]) / 2;
      const dayDate = addDays(currentWeekStart, d.offset);
      const dateLabel = `${dayDate.getMonth() + 1}/${dayDate.getDate()}`;
      ctx.fillStyle = d.name === '일' ? '#E57373' : d.name === '토' ? '#64B5F6' : '#E8E3DF';
      ctx.font = '11px Pretendard, sans-serif';
      ctx.fillText(dateLabel, cx, tableTop + 20);
      ctx.font = 'bold 14px Pretendard, sans-serif';
      ctx.fillText(`(${d.name})`, cx, tableTop + 38);
      
      const count = getAssignedCount(d);
      ctx.fillStyle = '#E8A38E';
      ctx.font = 'bold 11px Pretendard, sans-serif';
      ctx.fillText(`${count}명`, cx, tableTop + 56);
    });


    // 테이블 배경 채우기 (행)
    weeklyRequests.forEach((req, rIdx) => {
      const y = tableTop + tableHeaderH + (rIdx * rowHeight);
      ctx.fillStyle = rIdx % 2 === 0 ? '#231D1A' : '#2C2521';
      ctx.fillRect(45, y, width - 90, rowHeight);
    });

    // 테이블 선 긋기 (전체 테두리 + 열 구분선 + 행 가로선)
    ctx.strokeStyle = '#4A3A31';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // 외곽선 및 헤더 가로선
    ctx.rect(45, tableTop, width - 90, tableHeight);
    ctx.moveTo(45, tableTop + tableHeaderH);
    ctx.lineTo(width - 45, tableTop + tableHeaderH);
    // 각 행 가로선
    weeklyRequests.forEach((req, rIdx) => {
      const y = tableTop + tableHeaderH + (rIdx * rowHeight);
      ctx.moveTo(45, y);
      ctx.lineTo(width - 45, y);
    });
    // 열 세로선
    colX.forEach(x => {
      ctx.moveTo(x, tableTop);
      ctx.lineTo(x, tableTop + tableHeight);
    });
    ctx.stroke();

    // 행별 데이터 그리기
    weeklyRequests.forEach((req, rIdx) => {
      const y = tableTop + tableHeaderH + (rIdx * rowHeight);
      
      // 이름 (좌측 정렬)
      ctx.fillStyle = '#E8E3DF';
      ctx.font = 'bold 14px Pretendard, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(req.userName || `사원(${req.userIdx})`, colX[0] + 15, y + 27);
      
      ctx.textAlign = 'center';
      DAY_KEYS.forEach((d, cIdx) => {
        const cellX = colX[cIdx + 1];
        const cellW = colX[cIdx + 2] - cellX;
        const time = formatTimeValue(req[d.timeKey]);
        const status = req[d.key];
        const isGuestWorker = req.workPlaceIdx != null 
          ? Number(req.workPlaceIdx) !== Number(currentWorkPlaceIdx)
          : (req.workPlaceName && req.workPlaceName !== selectedBranchName);

        const isOtherBranchShift = (status === '타지점근무' && Number(req[d.wpIdxKey]) !== Number(currentWorkPlaceIdx)) || 
                                   (req[d.wpIdxKey] && Number(req[d.wpIdxKey]) !== Number(currentWorkPlaceIdx) && (time || status === '배정'));
        
        if (isOtherBranchShift) {
          if (!isGuestWorker) {
            ctx.fillStyle = 'rgba(142, 68, 173, 0.25)';
            ctx.beginPath();
            ctx.roundRect(cellX + 10, y + 8, cellW - 20, 28, 6);
            ctx.fill();
            ctx.fillStyle = '#C39BD3';
            
            if (time) {
              ctx.font = 'bold 11px Pretendard, sans-serif';
              ctx.fillText(req[d.wpNameKey] || '타지점', cellX + (cellW / 2), y + 21);
              ctx.font = 'bold 12px Pretendard, sans-serif';
              ctx.fillText(time, cellX + (cellW / 2), y + 34);
            } else {
              ctx.font = 'bold 11px Pretendard, sans-serif';
              ctx.fillText(req[d.wpNameKey] || '타지점', cellX + (cellW / 2), y + 26);
            }
          }
        } else if (time) {
          ctx.fillStyle = 'rgba(168, 90, 71, 0.25)';
          ctx.beginPath();
          ctx.roundRect(cellX + 12, y + 8, cellW - 24, 28, 14);
          ctx.fill();
          ctx.fillStyle = '#E8A38E';
          ctx.font = 'bold 13px Pretendard, sans-serif';
          ctx.fillText(time, cellX + (cellW / 2), y + 26);
        }
        // 미배정, 미신청, 신청은 PNG에서 표시하지 않음 (빈 칸)
      });
    });
    const link = document.createElement('a');
    link.download = `${selectedBranchName}_${format(currentWeekStart, 'yyyyMMdd')}_주간근무배정표.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-container">
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
              <span>📅 주간 근무 배정 관리</span>
              <Badge bg="primary" className="fs-6 fw-normal px-2.5 py-1.5 rounded-pill">{selectedBranchName}</Badge>
            </h2>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Form.Select 
              size="sm" 
              className="fw-bold rounded-pill shadow-xs" 
              style={{ minWidth: '135px', width: 'auto', minHeight: '38px', paddingTop: '6px', paddingBottom: '6px' }} 
              value={selectedWpIdx || ''} 
              onChange={(e) => setSelectedWpIdx(Number(e.target.value))}
            >
              {branches.map(b => <option key={b.wpIdx} value={b.wpIdx}>{b.wpName}</option>)}
            </Form.Select>
            <button type="button" className="btn btn-sm btn-outline-secondary fw-bold rounded-pill d-flex align-items-center gap-1.5 px-3 shadow-xs" style={{ height: '38px' }} onClick={() => { setWorkerSearchTerm(''); setShowAddWorkerModal(true); }}>
              <RiUserAddLine size={16} /> 타 지점 알바생 추가
            </button>
            <button type="button" className="btn btn-sm fw-bold rounded-pill d-flex align-items-center gap-1.5 px-3 shadow-xs png-download-btn" style={{ height: '38px' }} onClick={handleDownloadImage}>
              <RiDownload2Line size={16} /> PNG 이미지 저장
            </button>
            <Button variant="outline-primary" size="sm" className="fw-bold rounded-pill px-3 shadow-xs" style={{ height: '38px' }} onClick={() => handleSaveAll(false)} disabled={saving}>임시 저장</Button>
            <Button variant="primary" size="sm" className="fw-bold rounded-pill px-3.5 shadow-sm" style={{ height: '38px' }} onClick={() => handleSaveAll(true)} disabled={saving}>{saving ? <Spinner size="sm" animation="border" /> : '배정 확정'}</Button>
          </div>
        </div>
        <Card className="border-0 rounded-4 shadow-sm mb-4">
          <Card.Body className="d-flex justify-content-between align-items-center py-2.5 px-4">
            <Button variant="link" className="text-dark p-0" onClick={handlePrevWeek}><RiArrowLeftSLine size={24} /></Button>
            <div className="text-center">
              <h5 className="fw-bold mb-0">{format(currentWeekStart, 'yyyy년 MM월 dd일')} ~ {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MM월 dd일')}</h5>
              <span className="text-muted small">{format(currentWeekStart, 'MM월')} {getWeekOfMonth(currentWeekStart)}주차</span>
            </div>
            <Button variant="link" className="text-dark p-0" onClick={handleNextWeek}><RiArrowRightSLine size={24} /></Button>
          </Card.Body>
        </Card>
        {loading ? <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div> : (
          <Card className="border-0 rounded-4 shadow-sm overflow-hidden">
            <div className="table-responsive">
              <Table bordered hover className="custom-table mb-0 text-center align-middle" style={{ minWidth: '1000px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '160px' }} className="py-3">이름</th>
                    {DAY_KEYS.map(d => {
                      const count = getAssignedCount(d);
                      return (
                        <th key={d.key} className="py-2" style={{ width: '125px' }}>
                          <div style={{ fontSize: '0.9rem' }}>{format(addDays(currentWeekStart, d.offset), 'MM/dd')}</div>
                          <div className={d.name === '일' ? 'text-danger mb-1' : d.name === '토' ? 'text-primary mb-1' : 'text-muted mb-1'}>({d.name})</div>
                          <Badge bg="success" className="bg-opacity-10 text-success border border-success rounded-pill px-2">
                            {count}명
                          </Badge>
                        </th>
                      );
                    })}
                    <th style={{ width: '180px' }} className="py-3">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-5 text-muted">해당 주차에 신청된 내역이 없습니다.</td>
                    </tr>
                  ) : (
                    weeklyRequests.map(req => {
                      const isOtherBranch = req.workPlaceIdx != null 
                        ? Number(req.workPlaceIdx) !== Number(currentWorkPlaceIdx)
                        : (req.workPlaceName && req.workPlaceName !== selectedBranchName);
                      const isExplicitlyAdded = addedWorkerUserIdxs.includes(req.userIdx);

                      return (
                        <tr key={req.userIdx}>
                          <td className="fw-bold text-dark">
                            <div className="d-flex align-items-center justify-content-center gap-1.5">
                              <span>{req.userName || `사원(${req.userIdx})`}</span>
                              {isOtherBranch && (
                                <>
                                  <Badge bg="info" className="px-1.5 py-0.5 text-nowrap fw-normal" style={{ fontSize: '0.72rem' }}>
                                    {req.workPlaceName || '타지점'}
                                  </Badge>
                                  <button 
                                    type="button" 
                                    className="btn btn-outline-danger btn-sm p-0 d-inline-flex align-items-center justify-content-center ms-1 rounded-circle" 
                                    style={{ width: '22px', height: '22px' }}
                                    onClick={() => handleRemoveOtherBranchWorker(req)}
                                    title="현재 지점 배정 삭제 및 목록 제외"
                                  >
                                    <RiDeleteBinLine size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                          {DAY_KEYS.map(d => {
                            const status = req[d.key];
                            const time = formatTimeValue(req[d.timeKey]);
                            const otherWpName = req[d.wpNameKey] || req.assignedWorkPlaceName;
                            const isOtherBranchShift = (status === '타지점근무' && Number(req[d.wpIdxKey]) !== Number(currentWorkPlaceIdx)) || 
                                                       (req[d.wpIdxKey] && Number(req[d.wpIdxKey]) !== Number(currentWorkPlaceIdx) && (time || status === '배정'));

                            if (isOtherBranchShift) {
                              return (
                                <td key={d.key} className="bg-light opacity-85">
                                  <div 
                                    className="badge-other-branch"
                                    title={`${otherWpName || '타지점'}에 배정된 요일입니다.`}
                                  >
                                    <span className="other-branch-tag">{time ? time : '타지점근무'}</span>
                                    {otherWpName && <span className="other-branch-name">{otherWpName}</span>}
                                  </div>
                                </td>
                              );
                            }

                            let selectValue = '미신청';
                            let selectClass = 'bg-light text-muted border-light';

                            if (time) {
                              selectValue = time;
                              selectClass = 'bg-primary bg-opacity-10 text-primary border-primary';
                            } else if (status === '미배정') {
                              selectValue = '미배정';
                              selectClass = 'bg-danger bg-opacity-10 text-danger border-danger';
                            } else if (status === '신청') {
                              selectValue = '신청';
                              selectClass = 'bg-warning bg-opacity-10 text-warning border-warning';
                            } else {
                              selectValue = '미신청';
                            }

                            return (
                              <td key={d.key} className={selectValue === '미신청' ? 'bg-light opacity-75' : ''}>
                                <Form.Select 
                                  size="sm" 
                                  className={`fw-bold text-center rounded-3 shadow-none border ${selectClass}`}
                                  value={selectValue}
                                  onChange={(e) => handleCellChange(req.userIdx, d.key, d.timeKey, d.wpIdxKey, e.target.value)}
                                  disabled={saving}
                                >
                                  <option value="미신청" className="text-muted">미신청</option>
                                  <option value="미배정" className="text-danger fw-bold">미배정</option>
                                  {status === '신청' && (
                                    <option value="신청" className="text-warning fw-bold">신청 (희망)</option>
                                  )}
                                  <optgroup label="근무 시간 배정">
                                    {TIME_OPTIONS.map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </optgroup>
                                </Form.Select>
                              </td>
                            );
                          })}
                          <td className="text-start small text-muted text-truncate" style={{ maxWidth: '180px' }}>{req.wawRemarks || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        )}
      </Container>

      {/* 타 지점 알바생 추가 모달 */}
      <Modal 
        show={showAddWorkerModal} 
        onHide={() => {
          setShowAddWorkerModal(false);
          setWorkerSearchTerm('');
          setSelectedOtherUserIdx('');
        }} 
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-5">타 근무지 알바생 배정 추가</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="text-muted small mb-3">
            다른 근무지 소속의 알바생을 현재 지점(<strong>{selectedBranchName}</strong>)의 주간 배정표에 추가하여 근무 시간을 배정할 수 있습니다.
          </p>

          {otherBranchUsers.length === 0 ? (
            <div className="text-center py-3 text-muted">
              추가 가능한 다른 알바생이 없습니다. (모든 알바생이 이미 배정표에 등록되어 있습니다.)
            </div>
          ) : (
            <>
              {/* 실시간 검색창 */}
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                  <RiSearchLine /> 알바생 실시간 검색
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="이름 또는 소속 지점을 입력하세요 (예: 홍길동, 노란돼지)"
                  value={workerSearchTerm}
                  onChange={e => setWorkerSearchTerm(e.target.value)}
                  className="custom-input"
                  autoFocus
                />
              </Form.Group>

              {/* 알바생 선택 목록 */}
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold small text-muted d-flex justify-content-between">
                  <span>알바생 선택</span>
                  <span className="text-primary">{filteredOtherBranchUsers.length}명 검색됨</span>
                </Form.Label>
                <div 
                  className="border rounded-3 p-2 bg-light overflow-y-auto" 
                  style={{ maxHeight: '220px', minHeight: '100px' }}
                >
                  {filteredOtherBranchUsers.length === 0 ? (
                    <div className="text-center py-4 text-muted small">
                      "{workerSearchTerm}" 검색 결과가 없습니다.
                    </div>
                  ) : (
                    filteredOtherBranchUsers.map(u => {
                      const isSelected = String(selectedOtherUserIdx) === String(u.userIdx);
                      return (
                        <div
                          key={u.userIdx}
                          className={`d-flex align-items-center justify-content-between p-2 mb-1 rounded-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-primary text-white shadow-xs' 
                              : 'bg-white text-dark hover-bg'
                          }`}
                          onClick={() => setSelectedOtherUserIdx(u.userIdx)}
                          onDoubleClick={handleAddOtherWorker}
                          style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                        >
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold">{u.userName}</span>
                            <Badge 
                              bg={isSelected ? "light" : "secondary"} 
                              className={isSelected ? "text-dark" : "text-white"} 
                              style={{ fontSize: '0.72rem' }}
                            >
                              {u.workPlaceName || '소속없음'}
                            </Badge>
                            {u.userPhone && (
                              <span className={`small ${isSelected ? 'text-white-50' : 'text-muted'}`}>
                                ({u.userPhone})
                              </span>
                            )}
                          </div>
                          <Form.Check
                            type="radio"
                            name="selectedWorkerRadio"
                            checked={isSelected}
                            onChange={() => setSelectedOtherUserIdx(u.userIdx)}
                            className="ms-2"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            className="rounded-3" 
            onClick={() => {
              setShowAddWorkerModal(false);
              setWorkerSearchTerm('');
              setSelectedOtherUserIdx('');
            }}
          >
            취소
          </Button>
          <Button 
            variant="primary" 
            className="fw-bold rounded-3 px-4" 
            onClick={handleAddOtherWorker} 
            disabled={!selectedOtherUserIdx}
          >
            배정표에 추가
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminWeeklyAssign;
