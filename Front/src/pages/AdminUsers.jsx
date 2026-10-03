import React, { useState, useEffect, useMemo } from 'react';
import { Container, ButtonGroup, ToggleButton, Card, Table, Button, Spinner, Badge, Modal, Form, Alert, InputGroup } from 'react-bootstrap';
import {
  fetchAllUsers,
  fetchAdminWorkers,
  fetchAdminManagers,
  updateUserInfo,
  setTempPassword,
  deleteUser,
  restoreUser,
  getSensitiveInfo,
  updateSensitiveInfo,
  hardDeleteUser,
  fetchUserTypes,
  fetchWorkPlaces,
  createAdminUser,
  bulkUpdateUsers,
  fetchArchivedWorkers,
  restoreArchivedUser,
  deleteArchivedUser,
  leaveUser,
  fetchBanks,
  downloadUserExcel
} from '../api/authApi';
import PaginationBar from '../components/PaginationBar';
import BranchFilter from '../components/BranchFilter';
import Loading from '../components/Loading';
import { RiSearchLine, RiDownload2Line } from 'react-icons/ri';
import useAuthStore from '../store/useAuthStore';
import './AdminMain.css';

const SHOW_BANK_COLS_KEY = 'adminUsers.showBankCols';
const SHOW_ACCOUNT_PLAIN_KEY = 'adminUsers.showAccountPlain';

const formatPhoneNumber = (value) => {
  if (!value) return '';
  const num = value.replace(/[^0-9]/g, '');
  if (num.length <= 3) return num;
  if (num.length <= 7) return `${num.slice(0, 3)}-${num.slice(3)}`;
  return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
};

const readLocalFlag = (key) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const writeLocalFlag = (key, value) => {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch { /* ignore */ }
};

/** 목록 API의 기재 여부 플래그 ("기재" | null) */
const hasAccountOnList = (userAccountNumber) =>
  userAccountNumber != null && userAccountNumber !== '';

const AdminUsers = () => {
  const { user: me } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState('알바생'); // '전체', '알바생', '직원'
  const [selectedBranch, setSelectedBranch] = useState('');
  const [activeStatus, setActiveStatus] = useState('ACTIVE'); // 'ALL', 'ACTIVE', 'INACTIVE'
  const [searchName, setSearchName] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 아카이브(1년 경과 퇴사자) 모드 상태
  const [isArchivedMode, setIsArchivedMode] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  // 페이징 상태
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageInput, setPageInput] = useState('1');

  // 정렬: API sortBy (name | branch | status)
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [copyToast, setCopyToast] = useState('');
  const [banks, setBanks] = useState([]);
  const [showBankCols, setShowBankCols] = useState(() => readLocalFlag(SHOW_BANK_COLS_KEY));
  const [showAccountPlain, setShowAccountPlain] = useState(() => readLocalFlag(SHOW_ACCOUNT_PLAIN_KEY));
  /** 원문 조회 시 현재 페이지 캐시 (userIdx → 계좌번호) */
  const [accountPlainByIdx, setAccountPlainByIdx] = useState({});
  const [accountPlainLoading, setAccountPlainLoading] = useState(false);
  const [excelDownloading, setExcelDownloading] = useState(false);

  // 체크박스 다중 선택 상태
  const [selectedUserIdxs, setSelectedUserIdxs] = useState(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkWage, setBulkWage] = useState('');
  const [bulkFkUtIdx, setBulkFkUtIdx] = useState('');

  // 기본+민감 정보 수정 모달 (통합)
  const [editUser, setEditUser] = useState(null);
  const [editUserName, setEditUserName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBranch, setEditBranch] = useState(1);
  const [editFkUtIdx, setEditFkUtIdx] = useState('');
  const [editIsActive, setEditIsActive] = useState('');
  // 민감정보 통합
  const [editBank, setEditBank] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountNo, setEditAccountNo] = useState('');
  const [editWage, setEditWage] = useState('');
  const [sensitiveDataLoaded, setSensitiveDataLoaded] = useState(false);
  const [sensitiveLoading, setSensitiveLoading] = useState(false);

  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // 임시 비번 모달
  const [tempPwUser, setTempPwUser] = useState(null);
  const [tempPwValue, setTempPwValue] = useState('');
  const [tempPwSaving, setTempPwSaving] = useState(false);
  const [tempPwMsg, setTempPwMsg] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addUserPw, setAddUserPw] = useState('');
  const [addUserName, setAddUserName] = useState('');
  const [addUserBirth, setAddUserBirth] = useState('');
  const [addUserPhone, setAddUserPhone] = useState('');
  const [addWorkPlaceIdx, setAddWorkPlaceIdx] = useState(1);
  const [addUserRole, setAddUserRole] = useState('WORKER'); // WORKER or ADMIN
  const [addFkUtIdx, setAddFkUtIdx] = useState(''); // Only for ADMIN
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const [branches, setBranches] = useState([]);
  const [userTypes, setUserTypes] = useState([]);

  const myRole = useMemo(
    () => userTypes.find(t => Number(t.utIdx) === Number(me?.fkUtIdx)),
    [userTypes, me?.fkUtIdx]
  );
  const canViewSensitive = myRole?.utCanViewSensitive === 1;
  const canEditSensitive = myRole?.utCanEditSensitive === 1;
  const canExportExcel = myRole?.utCanExportExcel === 1;
  const bankColsVisible = canViewSensitive && showBankCols;
  const accountPlainVisible = bankColsVisible && showAccountPlain;

  const bankNameByCode = useMemo(() => {
    const map = {};
    for (const bank of banks) {
      const code = bank.bankCode ?? bank.code;
      if (code != null && code !== '') {
        map[String(code)] = bank.bankName || bank.name || String(code);
      }
    }
    return map;
  }, [banks]);

  const resolveBankLabel = (u) => {
    const code = u.bankCode || u.userBank;
    if (code == null || code === '') return '-';
    return bankNameByCode[String(code)] || String(code);
  };

  const clearAccountPlain = () => {
    setAccountPlainByIdx({});
    setAccountPlainLoading(false);
  };

  const handleShowBankColsChange = (show) => {
    if (!canViewSensitive) return;
    setShowBankCols(show);
    writeLocalFlag(SHOW_BANK_COLS_KEY, show);
    if (!show) {
      setShowAccountPlain(false);
      writeLocalFlag(SHOW_ACCOUNT_PLAIN_KEY, false);
      clearAccountPlain();
    }
  };

  const handleShowAccountPlainChange = (show) => {
    if (!canViewSensitive || !showBankCols) return;
    setShowAccountPlain(show);
    writeLocalFlag(SHOW_ACCOUNT_PLAIN_KEY, show);
    if (!show) clearAccountPlain();
  };

  const resolveAccountCell = (u) => {
    if (!hasAccountOnList(u.userAccountNumber)) return '미기재';
    if (!accountPlainVisible) return u.userAccountNumber;
    const plain = accountPlainByIdx[u.userIdx];
    if (plain != null && plain !== '') return plain;
    if (accountPlainLoading) return '…';
    return u.userAccountNumber;
  };

  const loadUsers = async (skipCache = false) => {
    setLoading(true);
    setSelectedUserIdxs(new Set()); // 페이지 변경시 선택 초기화
    try {
      const params = { size: 10, page };
      if (activeStatus !== 'ALL') {
        if (activeStatus === 'ACTIVE') params.isActive = 1;
        else if (activeStatus === 'INACTIVE') params.isActive = 0;
        else if (activeStatus === 'LEAVE') params.isActive = 2;
      }
      if (selectedBranch) {
        params.workPlaceIdx = Number(selectedBranch);
      }
      if (searchName) {
        params.userName = searchName;
      }
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortDir = sortDir;
      }

      let res;
      if (isArchivedMode && activeStatus === 'INACTIVE') {
        res = await fetchArchivedWorkers(params, archiveReason);
        if (!res.success && res.status === 403) {
          alert('권한이 없습니다.');
          setIsArchivedMode(false);
          setArchiveReason('');
          setLoading(false);
          return;
        }
      } else if (selectedRole === '전체') {
        res = await fetchAllUsers(params);
      } else if (selectedRole === '알바생') {
        res = await fetchAdminWorkers(params, skipCache);
      } else {
        res = await fetchAdminManagers(params);
      }

      if (res.success && res.data?.content !== undefined) {
        let list = res.data.content;
        if (selectedRole === '전체' && !sortBy) {
          list = [...list].sort((a, b) => {
            const aIsAdmin = (a.isAdmin === 1 || a.role === 'ADMIN' || a.userRole === 'ADMIN') ? 1 : 0;
            const bIsAdmin = (b.isAdmin === 1 || b.role === 'ADMIN' || b.userRole === 'ADMIN') ? 1 : 0;
            return bIsAdmin - aIsAdmin;
          });
        }
        setUsers(list);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
      } else if (res.success && Array.isArray(res.data)) {
        let list = res.data;
        if (selectedRole === '전체' && !sortBy) {
          list = [...list].sort((a, b) => {
            const aIsAdmin = (a.isAdmin === 1 || a.role === 'ADMIN' || a.userRole === 'ADMIN') ? 1 : 0;
            const bIsAdmin = (b.isAdmin === 1 || b.role === 'ADMIN' || b.userRole === 'ADMIN') ? 1 : 0;
            return bIsAdmin - aIsAdmin;
          });
        }
        setUsers(list);
        setTotalPages(1);
        setTotalElements(res.data.length);
      } else {
        setUsers([]);
        setTotalPages(1);
        setTotalElements(0);
      }
    } catch (e) {
      console.error(e);
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const loadData = async () => {
      const typeRes = await fetchUserTypes();
      if (typeRes.success) setUserTypes(typeRes.data);

      const branchRes = await fetchWorkPlaces();
      if (branchRes.success) setBranches([{ wpIdx: '', wpName: '전체' }, ...branchRes.data]);

      const bankRes = await fetchBanks();
      if (bankRes.success) {
        const list = Array.isArray(bankRes.data) ? bankRes.data : (bankRes.data?.content || []);
        setBanks(list);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (activeStatus !== 'INACTIVE') {
      setIsArchivedMode(false);
      setArchiveReason('');
    }
  }, [activeStatus]);

  useEffect(() => {
    loadUsers();
  }, [selectedRole, page, selectedBranch, activeStatus, isArchivedMode, sortBy, sortDir]);

  // 계좌번호 원문 조회 ON일 때만 현재 페이지(기재 행) sensitive-info 로드
  useEffect(() => {
    if (!accountPlainVisible) {
      clearAccountPlain();
      return undefined;
    }

    const targets = users.filter(
      (u) => u.userIdx != null && hasAccountOnList(u.userAccountNumber)
    );
    if (targets.length === 0) {
      clearAccountPlain();
      return undefined;
    }

    let cancelled = false;
    setAccountPlainLoading(true);
    setAccountPlainByIdx({});

    (async () => {
      const entries = await Promise.all(
        targets.map(async (u) => {
          const res = await getSensitiveInfo(u.userIdx);
          const no = res.success ? (res.data?.userAccountNumber || '') : '';
          return [u.userIdx, no];
        })
      );
      if (cancelled) return;
      const next = {};
      for (const [idx, no] of entries) {
        if (no) next[idx] = no;
      }
      setAccountPlainByIdx(next);
      setAccountPlainLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [accountPlainVisible, users]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setPageInput('1');
    loadUsers();
  };

  const handleSort = (col) => {
    if (sortBy === col) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortBy('');
        setSortDir('asc');
      }
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(0);
    setPageInput('1');
  };

  const renderSortIcon = (col) => {
    if (sortBy !== col) return <span className="ms-1 text-muted opacity-50">⇅</span>;
    return <span className="ms-1 text-primary">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  const copyUserId = async (userId) => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopyToast('아이디가 복사되었습니다.');
      setTimeout(() => setCopyToast(''), 1500);
    } catch {
      setCopyToast('복사에 실패했습니다.');
      setTimeout(() => setCopyToast(''), 1500);
    }
  };

  const handleDownloadUsersExcel = async () => {
    setExcelDownloading(true);
    const res = await downloadUserExcel(selectedBranch || null);
    setExcelDownloading(false);
    if (!res.success) alert(res.error || '엑셀 다운로드에 실패했습니다.');
  };

  const selectableUsers = users.filter(u => u.userIsActive !== 0);

  // 체크박스 제어
  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUserIdxs(new Set(selectableUsers.map(u => u.userIdx)));
    } else {
      setSelectedUserIdxs(new Set());
    }
  };

  const toggleSelectUser = (idx) => {
    setSelectedUserIdxs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const isAllSelected = selectableUsers.length > 0 && selectedUserIdxs.size === selectableUsers.length;

  const handleOpenBulkModal = () => {
    setBulkStatus('');
    setBulkWage('');
    setBulkFkUtIdx('');
    setBulkError('');
    setBulkSuccess('');
    setShowBulkModal(true);
  };

  const handleBulkSave = async () => {
    if (selectedUserIdxs.size === 0) return;
    setBulkError('');
    setBulkSuccess('');

    const payload = {
      userIdxList: Array.from(selectedUserIdxs),
      isActive: bulkStatus === '' ? null : Number(bulkStatus),
      fkUtIdx: bulkFkUtIdx === '' ? null : Number(bulkFkUtIdx),
      userHourlyWage: bulkWage === '' ? null : Number(bulkWage)
    };

    setBulkSaving(true);
    const res = await bulkUpdateUsers(payload);
    setBulkSaving(false);

    if (res.success) {
      setShowBulkModal(false);
      setSelectedUserIdxs(new Set());
      loadUsers(true);
    } else {
      setBulkError(res.error || '일괄 수정에 실패했습니다.');
    }
  };

  const openEditModal = (u) => {
    setEditUser(u);
    setEditUserName(u.userName || '');
    setEditEmail(u.userEmail || '');
    setEditPhone(u.userPhone || '');
    const matchedBranch = branches.find(b => b.wpName === u.workPlaceName);
    setEditBranch(matchedBranch ? matchedBranch.wpIdx : (branches.length > 1 ? branches[1].wpIdx : 1));
    const currentUtIdx = u.fkUtIdx ?? u.userTypeIdx ?? u.utIdx
      ?? userTypes.find(t => t.utName === (u.userTypeName || u.userType))?.utIdx
      ?? '';
    setEditFkUtIdx(currentUtIdx === '' || currentUtIdx == null ? '' : String(currentUtIdx));
    setEditIsActive(u.userIsActive !== undefined ? u.userIsActive : 1);
    setEditError('');
    setEditSuccess('');

    // 민감정보 초기화 (수정 모달에 통합됨)
    setEditBank(u.bankCode || u.userBank || '');
    setEditAccountName(u.userAccountName || '');
    setEditAccountNo(u.userAccountNumber || '');
    setEditWage(u.userHourlyWage || '');
    setSensitiveDataLoaded(false);
  };

  const handleRevealSensitive = async () => {
    if (!editUser) return;
    setSensitiveLoading(true);
    const res = await getSensitiveInfo(editUser.userIdx);
    setSensitiveLoading(false);
    if (res.success && res.data) {
      setEditBank(res.data.bankCode || res.data.userBank || '');
      setEditAccountName(res.data.userAccountName || '');
      setEditAccountNo(res.data.userAccountNumber || '');
      setEditWage(res.data.userHourlyWage || '');
      setSensitiveDataLoaded(true);
    } else {
      setEditError(res.error || '원본 민감정보 조회에 실패했습니다.');
    }
  };

  const handleEditSave = async () => {
    setEditError('');
    setEditSuccess('');
    setEditSaving(true);

    const payload = {
      userName: editUserName,
      userEmail: editEmail,
      userPhone: editPhone,
      fkWorkPlaceIdx: Number(editBranch),
      isActive: Number(editIsActive)
    };
    if (editFkUtIdx && Number(editUser.userIdx) !== Number(me?.userIdx)) {
      payload.fkUtIdx = Number(editFkUtIdx);
    }

    const res = await updateUserInfo(editUser.userIdx, payload);

    let resSensitive = { success: true };
    if (canEditSensitive) {
      const sensitivePayload = {
        bankCode: editBank,
        userAccountName: editAccountName,
        userHourlyWage: editWage ? Number(editWage) : null
      };
      if (!editAccountNo?.startsWith('기재')) {
        sensitivePayload.userAccountNumber = editAccountNo;
      }
      resSensitive = await updateSensitiveInfo(editUser.userIdx, sensitivePayload);
    }

    setEditSaving(false);

    if (res.success && resSensitive.success) {
      setEditSuccess('수정되었습니다.');
      loadUsers();
      setTimeout(() => setEditUser(null), 1000);
    } else {
      setEditError(res.error || resSensitive.error || '수정에 실패했습니다.');
    }
  };

  const handleToggleActive = async (u, t) => {
    // console.log(u);
    // return;
    let confirmMsg = "";
    let isCheck = false;
    if (t === 2) {
      confirmMsg = `${u.userName}을 휴직 처리하시겠습니까?`;
      isCheck = true;
    } else {
      confirmMsg = u.userIsActive === 1 ? `[${u.userName}]님을 퇴사 처리하시겠습니까?` : `[${u.userName}]님을 복직 처리하시겠습니까?`;
      isCheck = u.userIsActive === 1;
    }
    if (!window.confirm(confirmMsg)) { return; }

    if (isCheck && t === 100) {
      console.log(isCheck, " : ", t, " : ", '휴직');
      // return;
      const res = await deleteUser(u.userIdx);
      if (res.success) {
        // return;
        loadUsers();
        if (editUser && editUser.userIdx === u.userIdx) setEditUser(null);
      } else alert(res.error);
    } else if (isCheck && t === 2) {
      console.log(isCheck, " : ", t, " : ", '휴직');
      // return;
      const res = await leaveUser(u.userIdx);
      if (res.success) {
        // return;
        loadUsers();
        if (editUser && editUser.userIdx === u.userIdx) setEditUser(null);
      } else alert(res.error);
    } else {
      console.log(isCheck, " : ", t, " : ", '복직');
      // return;
      const res = await restoreUser(u.userIdx);
      if (res.success) {
        // return;
        loadUsers();
        if (editUser && editUser.userIdx === u.userIdx) setEditUser(null);
      } else alert(res.error);
    }
  };

  const handleHardDelete = async (u) => {
    if (!window.confirm(`[경고] [${u.userName}]님의 데이터를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 근무 기록이 함께 삭제될 수 있습니다.`)) return;
    const res = await hardDeleteUser(u.userIdx);
    if (res.success) loadUsers();
    else alert(res.error);
  };

  const handleSetTempPw = async () => {
    setTempPwMsg('');
    if (!tempPwValue) return setTempPwMsg('임시 비밀번호를 입력하세요.');

    setTempPwSaving(true);
    const res = await setTempPassword(tempPwUser.userIdx, tempPwValue);
    setTempPwSaving(false);

    if (res.success) {
      setTempPwMsg('임시 비밀번호가 설정되었습니다.');
      setTimeout(() => setTempPwUser(null), 1500);
    } else {
      setTempPwMsg(res.error || '설정에 실패했습니다.');
    }
  };

  const handleOpenAddModal = () => {
    setAddUserId('');
    setAddUserPw('');
    setAddUserName('');
    setAddUserBirth('');
    setAddUserPhone('');
    setAddWorkPlaceIdx(branches.length > 1 ? branches[1].wpIdx : 1);
    setAddUserRole(selectedRole === '직원' ? 'ADMIN' : 'WORKER');
    setAddFkUtIdx('');
    setAddError('');
    setAddSuccess('');
    setShowAddModal(true);
  };

  const handleAddUser = async () => {
    setAddError('');
    setAddSuccess('');

    if (!addUserId || !addUserPw || !addUserName || !addUserBirth || !addUserPhone) {
      alert('아이디, 임시 비밀번호, 이름, 생년월일, 연락처는 필수입니다.');
      return;
    }

    setAddSaving(true);
    const payload = {
      userId: addUserId,
      userPw: addUserPw,
      userName: addUserName,
      userBirth: addUserBirth,
      userPhone: addUserPhone,
      fkWorkPlaceIdx: Number(addWorkPlaceIdx),
      role: addUserRole,
    };

    if (addUserRole === 'ADMIN' && addFkUtIdx) {
      payload.fkUtIdx = Number(addFkUtIdx);
    }

    const res = await createAdminUser(payload);
    setAddSaving(false);

    if (res.success) {
      setAddSuccess('직원이 성공적으로 등록되었습니다.');
      alert('직원이 성공적으로 등록되었습니다.');
      loadUsers();
      setTimeout(() => setShowAddModal(false), 1000);
    } else {
      alert(res.error || '직원 등록에 실패했습니다.');
      setAddError(res.error || '직원 등록에 실패했습니다.');
    }
  };

  return (
    <div className="admin-container">
      <Container className="py-4 py-md-5">
        <div className="admin-header-card">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h2 className="fw-bold text-dark mb-1">직원 관리</h2>
              <p className="text-muted small mb-0">알바생 및 직원의 시급, 계좌 등 민감정보와 근무 상태를 관리합니다.</p>
            </div>

            <div className="d-flex flex-column align-items-md-end gap-2">
              <div className="d-flex gap-2 align-items-start flex-wrap">
                <div className="d-flex flex-column gap-2">
                  <ButtonGroup className="shadow-xs">
                    <ToggleButton id="tab-active-all" type="radio" variant={activeStatus === 'ALL' ? "success" : "outline-success"} name="activeRadio" value="ALL" checked={activeStatus === 'ALL'} onChange={() => { setActiveStatus('ALL'); setPage(0); setPageInput('1'); }} className="px-3 fw-bold">전체</ToggleButton>
                    <ToggleButton id="tab-active" type="radio" variant={activeStatus === 'ACTIVE' ? "success" : "outline-success"} name="activeRadio" value="ACTIVE" checked={activeStatus === 'ACTIVE'} onChange={() => { setActiveStatus('ACTIVE'); setPage(0); setPageInput('1'); }} className="px-3 fw-bold">재직</ToggleButton>
                    <ToggleButton id="tab-leave" type="radio" variant={activeStatus === 'LEAVE' ? "warning" : "outline-warning"} name="activeRadio" value="LEAVE" checked={activeStatus === 'LEAVE'} onChange={() => { setActiveStatus('LEAVE'); setPage(0); setPageInput('1'); }} className="px-3 fw-bold">휴직</ToggleButton>
                    <ToggleButton id="tab-resigned" type="radio" variant={activeStatus === 'INACTIVE' ? "danger" : "outline-danger"} name="activeRadio" value="INACTIVE" checked={activeStatus === 'INACTIVE'} onChange={() => { setActiveStatus('INACTIVE'); setPage(0); setPageInput('1'); }} className="px-3 fw-bold">퇴사</ToggleButton>
                  </ButtonGroup>
                </div>

                <ButtonGroup className="shadow-xs">
                  <ToggleButton id="role-all" type="radio" variant={selectedRole === '전체' ? "primary" : "outline-primary"} name="roleRadio" value="전체" checked={selectedRole === '전체'} onChange={e => { setSelectedRole(e.currentTarget.value); setSelectedBranch(''); setPage(0); setPageInput('1'); }} className="px-3 fw-bold">전체</ToggleButton>
                  <ToggleButton id="role-worker" type="radio" variant={selectedRole === '알바생' ? "primary" : "outline-primary"} name="roleRadio" value="알바생" checked={selectedRole === '알바생'} onChange={e => { setSelectedRole(e.currentTarget.value); setPage(0); setPageInput('1'); }} className="px-3 fw-bold">알바생</ToggleButton>
                  <ToggleButton id="role-admin" type="radio" variant={selectedRole === '직원' ? "primary" : "outline-primary"} name="roleRadio" value="직원" checked={selectedRole === '직원'} onChange={e => { setSelectedRole(e.currentTarget.value); setSelectedBranch(''); setPage(0); setPageInput('1'); }} className="px-3 fw-bold">직원</ToggleButton>
                </ButtonGroup>

                {/* <Button variant="outline-secondary" className="fw-bold px-3 rounded-pill shadow-sm ms-md-2" onClick={() => loadUsers(true)}>
                  ↻ 최신화
                </Button> */}
                <Button variant="primary" className="fw-bold px-3 rounded-pill shadow-sm ms-2" onClick={handleOpenAddModal}>
                  + 직원 추가
                </Button>
              </div>
            </div>
          </div>

          <hr className="my-3 opacity-25" />

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap w-100">
              <BranchFilter selectedBranch={selectedBranch} onlyAll={selectedRole === '직원'} onChange={(val) => { setSelectedBranch(val); setPage(0); setPageInput('1'); }} />

              <Form onSubmit={handleSearch} className="d-flex align-items-center gap-1 ms-md-auto" style={{ minWidth: '220px', maxWidth: '320px' }}>
                <Form.Control type="text" placeholder="이름 검색" value={searchName} onChange={e => setSearchName(e.target.value)} className="custom-input py-2" disabled={selectedRole === '직원'} />
                <Button type="submit" variant="primary" className="fw-bold d-flex align-items-center gap-1 rounded-3 px-3 py-2 text-nowrap" disabled={selectedRole === '직원'}>
                  <RiSearchLine size={16} /> 검색
                </Button>
              </Form>
            </div>

            <div className="d-flex gap-2 align-items-center ms-auto flex-wrap">
              {canViewSensitive && (
                <div className="bank-sensitive-controls d-flex flex-column flex-md-row gap-2">
                  {showBankCols && (
                    <div className="bank-sensitive-row">
                      <span className="bank-sensitive-label">계좌번호</span>
                      <div className="bank-sensitive-seg" role="radiogroup" aria-label="계좌번호 원문">
                        <input
                          type="radio"
                          id="account-plain-show"
                          name="accountPlainRadio"
                          checked={showAccountPlain}
                          onChange={() => handleShowAccountPlainChange(true)}
                        />
                        <label htmlFor="account-plain-show">원문 조회</label>
                        <input
                          type="radio"
                          id="account-plain-hide"
                          name="accountPlainRadio"
                          checked={!showAccountPlain}
                          onChange={() => handleShowAccountPlainChange(false)}
                        />
                        <label htmlFor="account-plain-hide">숨김</label>
                      </div>
                    </div>
                  )}
                  <div className="bank-sensitive-row">
                    <span className="bank-sensitive-label">은행정보</span>
                    <div className="bank-sensitive-seg" role="radiogroup" aria-label="은행정보 표시">
                      <input
                        type="radio"
                        id="bank-cols-show"
                        name="bankColsRadio"
                        checked={showBankCols}
                        onChange={() => handleShowBankColsChange(true)}
                      />
                      <label htmlFor="bank-cols-show">보기</label>
                      <input
                        type="radio"
                        id="bank-cols-hide"
                        name="bankColsRadio"
                        checked={!showBankCols}
                        onChange={() => handleShowBankColsChange(false)}
                      />
                      <label htmlFor="bank-cols-hide">숨김</label>
                    </div>
                  </div>
                </div>
              )}
              {canExportExcel && (
                <Button variant="success" className="fw-bold px-3 py-2 rounded-3 shadow-sm" onClick={handleDownloadUsersExcel} disabled={excelDownloading}>
                  <RiDownload2Line className="me-1" />
                  {excelDownloading ? '다운로드 중...' : '엑셀 다운로드'}
                </Button>
              )}
              <Button variant="secondary" disabled={selectedUserIdxs.size === 0} onClick={handleOpenBulkModal} className="fw-bold px-4 py-2 rounded-3 shadow-sm">
                선택된 직원 일괄 수정 ({selectedUserIdxs.size})
              </Button>
            </div>
          </div>
          {copyToast && <Alert variant="success" className="py-2 mt-2 mb-0">{copyToast}</Alert>}
          {activeStatus === 'INACTIVE' && (
            <Alert variant="warning" className="py-2 mt-3 mb-0 small text-dark" style={{ fontSize: '0.85rem' }}>
              <span className="fw-bold">※ 개인정보 보호를 위해 퇴사 후 1년이 경과한 직원의 신상 정보는 마스킹 처리되며, 원본은 권한이 있는 자만 조회할 수 있습니다.</span>
            </Alert>
          )}
        </div>

        {loading ? <Loading /> : (
          <>
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="custom-table align-middle mb-0 text-center">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '40px' }}>
                          <Form.Check type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} />
                        </th>
                        <th>No.</th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('branch')}>
                          소속 {renderSortIcon('branch')}
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('name')}>
                          이름 {renderSortIcon('name')}
                        </th>
                        {selectedRole === '전체' && <th>역할</th>}
                        {bankColsVisible && (
                          <>
                            <th>은행</th>
                            <th>계좌</th>
                          </>
                        )}
                        <th>아이디</th>
                        <th>시급</th>
                        <th>연락처</th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>
                          상태 {renderSortIcon('status')}
                        </th>
                        {activeStatus === 'INACTIVE' && <th>퇴사일</th>}
                        {activeStatus !== 'ACTIVE' && activeStatus !== 'LEAVE' && <th>삭제</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, idx) => (
                        <tr key={u.userIdx} className={u.userIsActive === 0 ? 'table-secondary text-muted' : u.userIsActive === 2 ? 'table-leave text-muted' : ''}>
                          <td>
                            <Form.Check type="checkbox" checked={selectedUserIdxs.has(u.userIdx)} onChange={() => toggleSelectUser(u.userIdx)} disabled={u.userIsActive === 0} title={u.userIsActive === 0 ? '퇴사자는 일괄 수정할 수 없습니다.' : ''} />
                          </td>
                          <td className="fw-bold text-muted">{page * 10 + idx + 1}</td>
                          <td className="fw-bold">{u.workPlaceName || '-'}</td>
                          <td className="fw-bold">
                            <span
                              className={u.userIsActive === 0 ? "text-secondary" : "text-primary"}
                              style={{ cursor: u.userIsActive === 0 ? 'not-allowed' : 'pointer', textDecoration: u.userIsActive === 0 ? 'none' : 'underline' }}
                              onClick={() => openEditModal(u)}
                              title={u.userIsActive === 0 ? "퇴사자의 정보는 수정할 수 없습니다." : "클릭하여 상세 조회 및 수정"}
                            >
                              {u.userName}
                              {Number(u.nameSeq) > 1 && u.userIdx != null && (
                                <Badge bg="secondary" className="ms-1">#{u.userIdx}</Badge>
                              )}
                            </span>
                          </td>
                          {selectedRole === '전체' && (
                            <td>
                              {(u.isAdmin === 1 || u.role === 'ADMIN' || u.userRole === 'ADMIN') ? <Badge bg="danger">관리자</Badge> : <Badge bg="info">알바생</Badge>}
                            </td>
                          )}
                          {bankColsVisible && (
                            <>
                              <td className="small">{resolveBankLabel(u)}</td>
                              <td className="small font-monospace">{resolveAccountCell(u)}</td>
                            </>
                          )}
                          <td
                            className="text-muted small"
                            style={{ cursor: 'pointer' }}
                            title="클릭하여 복사"
                            onClick={() => copyUserId(u.userId)}
                          >
                            {u.userId}
                          </td>
                          <td className="small">{canViewSensitive && u.userHourlyWage ? `${u.userHourlyWage.toLocaleString()}원` : (canViewSensitive ? '-' : '***')}</td>
                          <td className="small">{u.userPhone || '-'}</td>
                          <td>
                            {u.userIsActive === 1 ? <Badge bg="success">재직</Badge> : u.userIsActive === 2 ? <Badge bg="warning">휴직</Badge> : <Badge bg="dark">퇴사</Badge>}
                          </td>
                          {activeStatus === 'INACTIVE' && (
                            <td className="small text-danger">
                              {u.userWithdrawnAt ? u.userWithdrawnAt.split('T')[0] : '-'}
                            </td>
                          )}
                          {activeStatus !== 'ACTIVE' && activeStatus !== 'LEAVE' && (
                            <td>
                              <div className="d-flex justify-content-center gap-1">
                                {isArchivedMode ? (
                                  <>
                                    <Button size="sm" variant="success" onClick={async () => {
                                      if (!window.confirm(`[${u.userName}]님을 활성 상태로 복구하시겠습니까?`)) return;
                                      const res = await restoreArchivedUser(u.userIdx);
                                      if (res.success) { loadUsers(); } else alert(res.error || '복구 실패');
                                    }}>복구</Button>
                                    <Button size="sm" variant="danger" onClick={async () => {
                                      if (!window.confirm(`[경고] [${u.userName}]님의 데이터를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 모든 데이터가 영구 파기됩니다.`)) return;
                                      const res = await deleteArchivedUser(u.userIdx);
                                      if (res.success) { loadUsers(); } else alert(res.error || '삭제 실패');
                                    }}>삭제</Button>
                                  </>
                                ) : u.userIsActive === 0 ? (
                                  <Button size="sm" variant="outline-danger" onClick={() => handleHardDelete(u)}>영구 삭제</Button>
                                ) : (
                                  <span className="text-muted small">-</span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={9 + (bankColsVisible ? 2 : 0) + (activeStatus === 'INACTIVE' ? 1 : 0) + (activeStatus !== 'ACTIVE' && activeStatus !== 'LEAVE' ? 1 : 0)} className="text-center py-5 text-muted">해당하는 직원이 없습니다.</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </>
        )}

        {!loading && (
          <PaginationBar page={page} totalPages={totalPages} pageInput={pageInput} setPage={setPage} setPageInput={setPageInput} />
        )}
      </Container>

      {/* 일괄 수정 모달 */}
      <Modal show={showBulkModal} onHide={() => setShowBulkModal(false)} centered>
        <Modal.Header closeButton={!bulkSaving}>
          <Modal.Title className="fw-bold">선택된 직원 일괄 수정 ({selectedUserIdxs.size}명)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bulkSaving ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} className="mb-3" />
              <h6 className="fw-bold text-dark mb-1">직원 정보를 일괄 수정(반영)하는 중입니다...</h6>
              <p className="text-muted small mb-0">서버에 변경 사항을 반영하고 목록을 갱신 중입니다. 잠시만 기다려 주세요.</p>
            </div>
          ) : (
            <>
              {bulkError && <Alert variant="danger" className="py-2">{bulkError}</Alert>}
              {bulkSuccess && <Alert variant="success" className="py-2">{bulkSuccess}</Alert>}

              <div className="text-muted small mb-3">
                변경을 원하지 않는 항목은 비워두시면 기존 값이 유지됩니다.
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">재직 상태 변경</Form.Label>
                <Form.Select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                  <option value="">-- 변경 안 함 --</option>
                  <option value="1">재직 (복직)</option>
                  <option value="2">휴직 처리</option>
                  <option value="0">퇴사 (비활성화)</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">직급 일괄 변경</Form.Label>
                <Form.Select value={bulkFkUtIdx} onChange={e => setBulkFkUtIdx(e.target.value)}>
                  <option value="">-- 변경 안 함 --</option>
                  {userTypes.map(ut => (
                    <option key={ut.utIdx} value={ut.utIdx}>{ut.utName}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">시급 일괄 변경 (숫자만)</Form.Label>
                <Form.Control type="number" placeholder="예: 10030" value={bulkWage} onChange={e => setBulkWage(e.target.value)} />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkModal(false)} disabled={bulkSaving}>취소</Button>
          <Button variant="primary" onClick={handleBulkSave} disabled={bulkSaving} className="fw-bold px-4">
            {bulkSaving ? <Spinner as="span" animation="border" size="sm" /> : '일괄 수정 적용'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 기본 정보 + 은행 정보 수정 모달 */}
      <Modal show={!!editUser} onHide={() => setEditUser(null)} centered size="lg">
        <Modal.Header closeButton><Modal.Title className="fw-bold">✏️ {editUser?.userName} 정보 수정</Modal.Title></Modal.Header>
        <Modal.Body>
          {editError && <Alert variant="danger" className="py-2">{editError}</Alert>}
          {editSuccess && <Alert variant="success" className="py-2">{editSuccess}</Alert>}
          {editUser?.userIsActive === 0 && (
            <Alert variant="danger" className="py-2 small fw-bold">퇴사자의 정보는 보호를 위해 수정할 수 없습니다. (열람만 가능)</Alert>
          )}

          <div className="row">
            <div className="col-md-6">
              <div className="fw-bold text-primary mb-2 border-bottom pb-2">기본 정보</div>
              <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">이름</Form.Label><Form.Control value={editUserName} onChange={e => setEditUserName(e.target.value)} disabled={editUser?.userIsActive === 0} /></Form.Group>
              <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">이메일</Form.Label><Form.Control type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} disabled={editUser?.userIsActive === 0} /></Form.Group>
              <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">전화번호</Form.Label><Form.Control value={editPhone} onChange={e => setEditPhone(formatPhoneNumber(e.target.value))} disabled={editUser?.userIsActive === 0} /></Form.Group>
              <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">소속 지점</Form.Label>
                <Form.Select value={editBranch} onChange={e => setEditBranch(Number(e.target.value))} disabled={editUser?.userIsActive === 0}>
                  {branches.filter(b => b.wpIdx !== '').map(b => <option key={b.wpIdx} value={b.wpIdx}>{b.wpName}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">직급</Form.Label>
                <Form.Select
                  value={editFkUtIdx}
                  onChange={e => setEditFkUtIdx(e.target.value)}
                  disabled={Number(editUser?.userIdx) === Number(me?.userIdx) || editUser?.userIsActive === 0}
                >
                  <option value="">직급 선택</option>
                  {userTypes.map(ut => <option key={ut.utIdx} value={String(ut.utIdx)}>{ut.utName}</option>)}
                </Form.Select>
                {(() => {
                  const currentName = editUser?.userTypeName
                    || editUser?.userType
                    || userTypes.find(t => String(t.utIdx) === String(editFkUtIdx))?.utName;
                  return currentName ? (
                    <div className="text-muted small mt-1">현재 직급: <span className="fw-bold text-dark">{currentName}</span></div>
                  ) : null;
                })()}
                {Number(editUser?.userIdx) === Number(me?.userIdx) && (
                  <div className="text-muted small mt-1">본인 계정의 직급은 변경할 수 없습니다.</div>
                )}
              </Form.Group>
            </div>

            <div className="col-md-6">
              <div className="fw-bold text-danger mb-2 border-bottom pb-2">
                급여 및 계좌 정보
              </div>
              {!canViewSensitive ? (
                <Alert variant="secondary" className="py-2 small">민감정보 조회 권한이 없습니다.</Alert>
              ) : (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold text-muted small">은행명</Form.Label>
                    <Form.Select value={editBank} onChange={e => setEditBank(e.target.value)} disabled={!canEditSensitive || editUser?.userIsActive === 0}>
                      <option value="">은행 선택</option>
                      {banks.map(bank => (
                        <option key={bank.bankCode || bank.code || bank.bankName} value={bank.bankCode || bank.code}>
                          {bank.bankName || bank.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold text-muted small">예금주명</Form.Label>
                    <Form.Control value={editAccountName} onChange={e => setEditAccountName(e.target.value)} placeholder="예금주 입력" disabled={!canEditSensitive || editUser?.userIsActive === 0} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold text-muted small">계좌번호</Form.Label>
                    <InputGroup>
                      <Form.Control value={editAccountNo} onChange={e => setEditAccountNo(e.target.value.replace(/[^0-9]/g, ''))} placeholder="계좌번호 입력" disabled={!canEditSensitive || (editAccountNo?.startsWith('기재') && !sensitiveDataLoaded) || editUser?.userIsActive === 0} />
                      {canViewSensitive && !sensitiveDataLoaded && editAccountNo?.startsWith('기재') && (
                        <Button variant="outline-danger" onClick={handleRevealSensitive} disabled={sensitiveLoading} className="fw-bold px-3">
                          {sensitiveLoading ? <Spinner size="sm" /> : '원문 조회'}
                        </Button>
                      )}
                    </InputGroup>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold text-muted small">시급</Form.Label>
                    <Form.Control type="number" value={editWage} onChange={e => setEditWage(e.target.value)} placeholder="숫자만 입력" disabled={!canEditSensitive || editUser?.userIsActive === 0} />
                  </Form.Group>
                </>
              )}
              {!canEditSensitive && canViewSensitive && (
                <Alert variant="warning" className="py-2 small">민감정보 수정 권한이 없어 급여/계좌는 저장되지 않습니다.</Alert>
              )}
            </div>
          </div>

          <hr className="my-3 opacity-25" />
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button size="sm" variant={editUser?.userIsActive === 1 ? 'outline-danger' : 'outline-success'} className="fw-bold px-3 py-1 me-2" onClick={() => handleToggleActive(editUser, 100)}>
                {editUser?.userIsActive === 1 ? '퇴사 처리' : '복직 처리'}
              </Button>
              {
                (editUser?.userIsActive === 2 || editUser?.userIsActive === 0) ?
                  <div></div>
                  :
                  <Button size="sm" variant={"outline-secondary"} className="fw-bold px-3 py-1" onClick={() => handleToggleActive(editUser, 2)}>
                    휴직 처리
                  </Button>
              }
            </div>

            <Button size="sm" variant="outline-warning" className="fw-bold px-3 py-1" onClick={() => { setTempPwUser(editUser); setTempPwValue(''); setTempPwMsg(''); }}>🔐 임시 비밀번호 설정</Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditUser(null)}>닫기</Button>
          <Button variant="primary" onClick={handleEditSave} disabled={editSaving || editUser?.userIsActive === 0}>
            {editSaving ? <Spinner as="span" animation="border" size="sm" /> : '저장'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!tempPwUser} onHide={() => setTempPwUser(null)} centered>
        <Modal.Header closeButton><Modal.Title className="fw-bold">🔐 {tempPwUser?.userName} 임시 비밀번호 설정</Modal.Title></Modal.Header>
        <Modal.Body>
          {tempPwMsg && <Alert variant={tempPwMsg.includes('설정') ? 'success' : 'danger'} className="py-2">{tempPwMsg}</Alert>}
          <Form.Group><Form.Label className="fw-bold text-muted small">임시 비밀번호</Form.Label><Form.Control type="text" value={tempPwValue} onChange={e => setTempPwValue(e.target.value)} placeholder="임시 비밀번호 입력" /></Form.Group>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setTempPwUser(null)}>닫기</Button><Button variant="warning" onClick={handleSetTempPw} disabled={tempPwSaving}>{tempPwSaving ? <Spinner as="span" animation="border" size="sm" /> : '설정'}</Button></Modal.Footer>
      </Modal>

      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton><Modal.Title className="fw-bold">새로운 직원 추가</Modal.Title></Modal.Header>
        <Modal.Body>
          {addError && <Alert variant="danger" className="py-2">{addError}</Alert>}
          {addSuccess && <Alert variant="success" className="py-2">{addSuccess}</Alert>}
          <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">권한</Form.Label><Form.Select value={addUserRole} onChange={e => { setAddUserRole(e.target.value); if (e.target.value === 'WORKER') setAddFkUtIdx(''); }}><option value="WORKER">알바생</option><option value="ADMIN">직원</option></Form.Select></Form.Group>
          <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">소속 지점</Form.Label><Form.Select value={addWorkPlaceIdx} onChange={e => setAddWorkPlaceIdx(e.target.value)}>{branches.filter(b => b.wpIdx !== '').map(b => <option key={b.wpIdx} value={b.wpIdx}>{b.wpName}</option>)}</Form.Select></Form.Group>
          {addUserRole === 'ADMIN' && (<Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">직급</Form.Label><Form.Select value={addFkUtIdx} onChange={e => setAddFkUtIdx(e.target.value)}><option value="">-- 직급 선택 --</option>{userTypes.map(ut => <option key={ut.utIdx} value={ut.utIdx}>{ut.utName}</option>)}</Form.Select></Form.Group>)}
          <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">아이디 *</Form.Label><Form.Control value={addUserId} onChange={e => setAddUserId(e.target.value)} placeholder="아이디 입력" /></Form.Group>
          <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">임시 비밀번호 *</Form.Label><Form.Control type="text" value={addUserPw} onChange={e => setAddUserPw(e.target.value)} placeholder="임시 비밀번호 입력" /></Form.Group>
          <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">이름 *</Form.Label><Form.Control value={addUserName} onChange={e => setAddUserName(e.target.value)} placeholder="이름 입력" /></Form.Group>
          <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">생년월일 *</Form.Label><Form.Control type="date" value={addUserBirth} onChange={e => setAddUserBirth(e.target.value)} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">연락처 *</Form.Label><Form.Control value={addUserPhone} onChange={e => setAddUserPhone(formatPhoneNumber(e.target.value))} placeholder="예: 010-1234-5678" /></Form.Group>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowAddModal(false)}>닫기</Button><Button variant="primary" onClick={handleAddUser} disabled={addSaving}>{addSaving ? <Spinner as="span" animation="border" size="sm" /> : '등록'}</Button></Modal.Footer>
      </Modal>

      <Modal show={showReasonModal} onHide={() => { setShowReasonModal(false); setIsArchivedMode(false); }} centered>
        <Modal.Header closeButton><Modal.Title className="fw-bold">아카이빙 데이터 조회 사유</Modal.Title></Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="small mb-3">
            보안 규정 및 인증 기준에 따라 퇴사 후 1년이 경과한 사용자의 아카이빙 데이터를 조회하려면 <strong>반드시 조회 사유를 남겨야 합니다.</strong> (감사 로그에 기록됨)
          </Alert>
          <Form.Group>
            <Form.Label className="fw-bold text-muted small">조회 사유 입력 *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={archiveReason}
              onChange={e => setArchiveReason(e.target.value)}
              placeholder="예: 근로기준법상 체불임금 정산 확인 요청 등"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowReasonModal(false); setIsArchivedMode(false); }}>취소</Button>
          <Button variant="primary" onClick={() => {
            if (!archiveReason.trim()) {
              alert('조회 사유를 입력해주세요.');
              return;
            }
            setShowReasonModal(false);
            setIsArchivedMode(true);
            setPage(0);
            setPageInput('1');
          }}>조회하기</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default AdminUsers;
