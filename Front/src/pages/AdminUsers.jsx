import React, { useState, useEffect, useMemo } from 'react';
import { Container } from 'react-bootstrap';
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
import Loading from '../components/Loading';
import useAuthStore from '../store/useAuthStore';
import useSyncExcelDownloadProgress from '../hooks/useSyncExcelDownloadProgress';

import { formatPhoneNumber, readLocalFlag, writeLocalFlag, hasAccountOnList } from '../components/adminUsers/adminUsersUtils';
import AdminUsersToolbar from '../components/adminUsers/AdminUsersToolbar';
import AdminUsersTable from '../components/adminUsers/AdminUsersTable';
import {
  BulkEditModal,
  EditUserModal,
  TempPasswordModal,
  AddUserModal,
  ArchiveReasonModal
} from '../components/adminUsers/AdminUsersModals';

import './AdminMain.css';

const SHOW_BANK_COLS_KEY = 'adminUsers.showBankCols';
const SHOW_ACCOUNT_PLAIN_KEY = 'adminUsers.showAccountPlain';

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
  const {
    busy: excelDownloading,
    runDownload: runExcelDownload,
    ProgressModal: ExcelDownloadProgressModal,
  } = useSyncExcelDownloadProgress({
    title: '직원 엑셀 다운로드 중...',
  });

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
    (banks || []).forEach(bank => {
      const code = bank.bankCode ?? bank.code;
      const name = bank.bankName ?? bank.name;
      if (code != null) map[String(code)] = name;
      if (name) map[name] = name;
    });
    return map;
  }, [banks]);

  const resolveBankLabel = (u) => {
    const code = u.bankCode || u.userBank;
    if (!code) return '-';
    return bankNameByCode[String(code)] || code;
  };

  const clearAccountPlain = () => {
    setAccountPlainByIdx({});
    setAccountPlainLoading(false);
  };

  const handleShowBankColsChange = (show) => {
    setShowBankCols(show);
    writeLocalFlag(SHOW_BANK_COLS_KEY, show);
    if (!show) {
      setShowAccountPlain(false);
      writeLocalFlag(SHOW_ACCOUNT_PLAIN_KEY, false);
      clearAccountPlain();
    }
  };

  const handleShowAccountPlainChange = (show) => {
    setShowAccountPlain(show);
    writeLocalFlag(SHOW_ACCOUNT_PLAIN_KEY, show);
    if (!show) {
      clearAccountPlain();
    }
  };

  const resolveAccountCell = (u) => {
    if (!hasAccountOnList(u.userAccountNumber)) return '-';
    if (!accountPlainVisible) return '기재됨';
    const plain = accountPlainByIdx[u.userIdx];
    if (plain) return plain;
    if (accountPlainLoading) return '조회 중...';
    return '기재됨';
  };

  const loadUsers = async (skipCache = false) => {
    setLoading(true);
    try {
      let res;
      const params = { size: 10, page };
      if (selectedBranch) params.workPlaceIdx = selectedBranch;
      if (searchName) params.name = searchName;
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortDir = sortDir;
      }

      if (isArchivedMode) {
        res = await fetchArchivedWorkers(params);
      } else if (selectedRole === '직원') {
        res = await fetchAdminManagers(params);
      } else if (selectedRole === '알바생') {
        if (activeStatus === 'ACTIVE') params.status = 'ACTIVE';
        else if (activeStatus === 'LEAVE') params.status = 'LEAVE';
        else if (activeStatus === 'INACTIVE') params.status = 'INACTIVE';
        res = await fetchAdminWorkers(params);
      } else {
        if (activeStatus === 'ACTIVE') params.status = 'ACTIVE';
        else if (activeStatus === 'LEAVE') params.status = 'LEAVE';
        else if (activeStatus === 'INACTIVE') params.status = 'INACTIVE';
        res = await fetchAllUsers(params);
      }

      if (res && res.success) {
        let content = [];
        let totalP = 1;
        let totalE = 0;

        if (Array.isArray(res.data)) {
          content = res.data;
          totalP = 1;
          totalE = res.data.length;
        } else if (res.data) {
          content = res.data.content || [];
          totalP = res.data.totalPages || 1;
          totalE = res.data.totalElements || 0;
        }

        if (selectedRole === '전체') {
          content.sort((a, b) => {
            const aIsAdmin = (a.isAdmin === 1 || a.role === 'ADMIN' || a.userRole === 'ADMIN') ? 1 : 0;
            const bIsAdmin = (b.isAdmin === 1 || b.role === 'ADMIN' || b.userRole === 'ADMIN') ? 1 : 0;
            if (aIsAdmin !== bIsAdmin) return bIsAdmin - aIsAdmin;

            const aName = a.userName || '';
            const bName = b.userName || '';
            return aName.localeCompare(bName, 'ko');
          });
        }

        if (!sortBy) {
          content.sort((a, b) => {
            const aIsAdmin = (a.isAdmin === 1 || a.role === 'ADMIN' || a.userRole === 'ADMIN') ? 1 : 0;
            const bIsAdmin = (b.isAdmin === 1 || b.role === 'ADMIN' || b.userRole === 'ADMIN') ? 1 : 0;
            if (aIsAdmin !== bIsAdmin) return bIsAdmin - aIsAdmin;

            const aActive = a.userIsActive;
            const bActive = b.userIsActive;
            const getPriority = (status) => {
              if (status === 1) return 1;
              if (status === 2) return 2;
              return 3;
            };
            if (getPriority(aActive) !== getPriority(bActive)) {
              return getPriority(aActive) - getPriority(bActive);
            }
            return (a.userName || '').localeCompare(b.userName || '', 'ko');
          });
        }

        setUsers(content);
        setTotalPages(totalP);
        setTotalElements(totalE);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const typeRes = await fetchUserTypes();
      if (typeRes.success) setUserTypes(typeRes.data);

      const branchRes = await fetchWorkPlaces();
      if (branchRes.success) setBranches(branchRes.data);

      const bankRes = await fetchBanks();
      if (bankRes.success) {
        const list = Array.isArray(bankRes.data) ? bankRes.data : (bankRes.data?.content || []);
        setBanks(list);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    loadUsers();
    setSelectedUserIdxs(new Set());
    clearAccountPlain();
  }, [selectedRole, selectedBranch, activeStatus, page, isArchivedMode, sortBy, sortDir]);

  useEffect(() => {
    if (!accountPlainVisible || loading || users.length === 0) return;

    let canceled = false;
    const targets = users.filter(
      u => hasAccountOnList(u.userAccountNumber) && !accountPlainByIdx[u.userIdx]
    );

    if (targets.length === 0) return;

    setAccountPlainLoading(true);
    (async () => {
      const entries = await Promise.all(
        targets.map(async (u) => {
          try {
            const res = await getSensitiveInfo(u.userIdx);
            const no = res.success ? (res.data?.userAccountNumber || '') : '';
            return [u.userIdx, no];
          } catch {
            return [u.userIdx, ''];
          }
        })
      );
      if (canceled) return;
      const next = {};
      entries.forEach(([uid, no]) => {
        if (no) next[uid] = no;
      });
      setAccountPlainByIdx(prev => ({ ...prev, ...next }));
      setAccountPlainLoading(false);
    })();

    return () => {
      canceled = true;
    };
  }, [accountPlainVisible, users, loading]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setPageInput('1');
    loadUsers();
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortBy('');
        setSortDir('asc');
      }
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
    setPageInput('1');
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <span className="text-muted ms-1 opacity-25">↕</span>;
    return sortDir === 'asc' ? <span className="text-primary ms-1">▲</span> : <span className="text-primary ms-1">▼</span>;
  };

  const isAllSelected = users.length > 0 && users.filter(u => u.userIsActive !== 0).length > 0 &&
    users.filter(u => u.userIsActive !== 0).every(u => selectedUserIdxs.has(u.userIdx));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIdxs(new Set());
    } else {
      const activeIdxs = users.filter(u => u.userIsActive !== 0).map(u => u.userIdx);
      setSelectedUserIdxs(new Set(activeIdxs));
    }
  };

  const toggleSelectUser = (userIdx) => {
    const next = new Set(selectedUserIdxs);
    if (next.has(userIdx)) next.delete(userIdx);
    else next.add(userIdx);
    setSelectedUserIdxs(next);
  };

  const handleOpenBulkModal = () => {
    setBulkError('');
    setBulkSuccess('');
    setBulkStatus('');
    setBulkWage('');
    setBulkFkUtIdx('');
    setShowBulkModal(true);
  };

  const handleBulkSave = async () => {
    if (!bulkStatus && !bulkWage && !bulkFkUtIdx) {
      setBulkError('수정할 항목(상태, 직급, 시급) 중 최소 하나는 입력해야 합니다.');
      return;
    }

    setBulkSaving(true);
    setBulkError('');
    setBulkSuccess('');

    const targetList = Array.from(selectedUserIdxs).map(idx => {
      const u = users.find(user => user.userIdx === idx);
      return {
        userIdx: idx,
        userName: u ? u.userName : `직원 #${idx}`
      };
    });

    const payload = {
      users: targetList,
      userIsActive: bulkStatus !== '' ? Number(bulkStatus) : undefined,
      userHourlyWage: bulkWage !== '' ? Number(bulkWage) : undefined,
      fkUtIdx: bulkFkUtIdx !== '' ? Number(bulkFkUtIdx) : undefined
    };

    const res = await bulkUpdateUsers(payload);
    setBulkSaving(false);

    if (res.success) {
      alert('일괄 수정이 완료되었습니다.');
      setShowBulkModal(false);
      setSelectedUserIdxs(new Set());
      loadUsers();
    } else {
      setBulkError(res.error || '일괄 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDownloadUsersExcel = async () => {
    if (excelDownloading) return;
    const branchName = selectedBranch
      ? branches.find(b => String(b.wpIdx) === String(selectedBranch))?.wpName || ''
      : '';
    await runExcelDownload(async () => {
      return await downloadUserExcel({
        role: selectedRole,
        branch: branchName,
        status: activeStatus,
        search: searchName,
      });
    });
  };

  const openEditModal = async (u) => {
    setEditUser(u);
    setEditUserName(u.userName || '');
    setEditEmail(u.userEmail || '');
    setEditPhone(formatPhoneNumber(u.userPhone || ''));
    setEditBranch(u.fkWorkPlaceIdx || u.workPlaceIdx || 1);
    setEditFkUtIdx(u.fkUtIdx ? String(u.fkUtIdx) : '');
    setEditIsActive(u.userIsActive !== undefined ? String(u.userIsActive) : '1');

    setEditBank(u.bankCode || u.userBank || '');
    setEditAccountName(u.userAccountHolder || u.userAccountName || '');
    setEditAccountNo(u.userAccountNumber || '');
    setEditWage(u.userHourlyWage !== undefined ? String(u.userHourlyWage) : '');

    setSensitiveDataLoaded(false);
    setEditError('');
    setEditSuccess('');
  };

  const handleRevealSensitive = async () => {
    if (!editUser || sensitiveLoading) return;
    setSensitiveLoading(true);
    try {
      const res = await getSensitiveInfo(editUser.userIdx);
      if (res.success && res.data) {
        setEditAccountNo(res.data.userAccountNumber || '');
        if (res.data.userBank) setEditBank(res.data.userBank);
        if (res.data.userAccountName) setEditAccountName(res.data.userAccountName);
        if (res.data.userHourlyWage !== undefined) setEditWage(String(res.data.userHourlyWage));
        setSensitiveDataLoaded(true);
      } else {
        alert(res.error || '민감정보를 불러올 수 없습니다.');
      }
    } catch {
      alert('민감정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setSensitiveLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setEditSaving(true);
    setEditError('');
    setEditSuccess('');

    const payload = {
      userName: editUserName,
      userEmail: editEmail,
      userPhone: editPhone,
      fkWorkPlaceIdx: Number(editBranch),
      userIsActive: Number(editIsActive),
    };
    if (editFkUtIdx) {
      payload.fkUtIdx = Number(editFkUtIdx);
    }

    const res = await updateUserInfo(editUser.userIdx, payload);

    if (canEditSensitive) {
      const sensitivePayload = {
        userBank: editBank,
        userAccountName: editAccountName,
        userAccountNumber: editAccountNo,
        userHourlyWage: editWage ? Number(editWage) : 0,
      };
      await updateSensitiveInfo(editUser.userIdx, sensitivePayload);
    }

    setEditSaving(false);

    if (res.success) {
      alert('정보가 성공적으로 수정되었습니다.');
      setEditUser(null);
      loadUsers();
    } else {
      setEditError(res.error || '수정에 실패했습니다.');
    }
  };

  const handleToggleActive = async (u, t) => {
    const isDeactivating = (t === 100 && u.userIsActive === 1);
    const isLeaving = (t === 2);
    const actionText = isDeactivating ? '퇴사(비활성화)' : isLeaving ? '휴직' : '복직';

    if (!window.confirm(`[${u.userName}]님을 ${actionText} 처리하시겠습니까?`)) {
      return;
    }

    try {
      if (isDeactivating) {
        const res = await deleteUser(u.userIdx);
        if (res.success) {
          alert('퇴사 처리가 완료되었습니다.');
          setEditUser(null);
          loadUsers();
        } else alert(res.error || '처리에 실패했습니다.');
      } else if (isLeaving) {
        const res = await leaveUser(u.userIdx);
        if (res.success) {
          alert('휴직 처리가 완료되었습니다.');
          setEditUser(null);
          loadUsers();
        } else alert(res.error || '처리에 실패했습니다.');
      } else {
        const res = await restoreUser(u.userIdx);
        if (res.success) {
          alert('복직 처리가 완료되었습니다.');
          setEditUser(null);
          loadUsers();
        } else alert(res.error || '처리에 실패했습니다.');
      }
    } catch {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  const handleHardDelete = async (u) => {
    if (!window.confirm(`[경고] [${u.userName}]님의 데이터를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 모든 데이터가 영구 파기됩니다.`)) return;
    const res = await hardDeleteUser(u.userIdx);
    if (res.success) { alert('영구 삭제되었습니다.'); loadUsers(); }
    else alert(res.error || '삭제 실패');
  };

  const handleSetTempPw = async () => {
    if (!tempPwValue) return;
    setTempPwSaving(true);
    setTempPwMsg('');
    const res = await setTempPassword(tempPwUser.userIdx, tempPwValue);
    setTempPwSaving(false);
    if (res.success) {
      alert('임시 비밀번호가 설정되었습니다.');
      setTempPwUser(null);
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
    setAddWorkPlaceIdx(branches[0]?.wpIdx || 1);
    setAddUserRole('WORKER');
    setAddFkUtIdx('');
    setAddError('');
    setAddSuccess('');
    setShowAddModal(true);
  };

  const handleAddUser = async () => {
    if (!addUserId || !addUserPw || !addUserName || !addUserBirth || !addUserPhone) {
      setAddError('필수 항목을 모두 입력해주세요.');
      return;
    }
    setAddSaving(true);
    setAddError('');
    setAddSuccess('');

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

  const copyUserId = (userId) => {
    navigator.clipboard.writeText(userId);
    setCopyToast(`'${userId}' 아이디가 복사되었습니다.`);
    setTimeout(() => setCopyToast(''), 2000);
  };

  return (
    <div className="admin-container">
      <Container className="py-2 py-md-4">
        <AdminUsersToolbar
          handleOpenAddModal={handleOpenAddModal}
          activeStatus={activeStatus}
          setActiveStatus={setActiveStatus}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          searchName={searchName}
          setSearchName={setSearchName}
          handleSearch={handleSearch}
          setPage={setPage}
          setPageInput={setPageInput}
          canViewSensitive={canViewSensitive}
          showBankCols={showBankCols}
          handleShowBankColsChange={handleShowBankColsChange}
          showAccountPlain={showAccountPlain}
          handleShowAccountPlainChange={handleShowAccountPlainChange}
          canExportExcel={canExportExcel}
          handleDownloadUsersExcel={handleDownloadUsersExcel}
          excelDownloading={excelDownloading}
          selectedUserIdxs={selectedUserIdxs}
          handleOpenBulkModal={handleOpenBulkModal}
          copyToast={copyToast}
        />

        {loading ? <Loading /> : (
          <AdminUsersTable
            isAllSelected={isAllSelected}
            toggleSelectAll={toggleSelectAll}
            handleSort={handleSort}
            renderSortIcon={renderSortIcon}
            selectedRole={selectedRole}
            bankColsVisible={bankColsVisible}
            activeStatus={activeStatus}
            users={users}
            selectedUserIdxs={selectedUserIdxs}
            toggleSelectUser={toggleSelectUser}
            page={page}
            openEditModal={openEditModal}
            resolveBankLabel={resolveBankLabel}
            resolveAccountCell={resolveAccountCell}
            copyUserId={copyUserId}
            canViewSensitive={canViewSensitive}
            isArchivedMode={isArchivedMode}
            restoreArchivedUser={restoreArchivedUser}
            deleteArchivedUser={deleteArchivedUser}
            loadUsers={loadUsers}
            handleHardDelete={handleHardDelete}
          />
        )}

        {!loading && (
          <PaginationBar page={page} totalPages={totalPages} pageInput={pageInput} setPage={setPage} setPageInput={setPageInput} />
        )}
      </Container>

      <BulkEditModal
        show={showBulkModal}
        onHide={() => setShowBulkModal(false)}
        bulkSaving={bulkSaving}
        selectedUserCount={selectedUserIdxs.size}
        bulkError={bulkError}
        bulkSuccess={bulkSuccess}
        bulkStatus={bulkStatus}
        setBulkStatus={setBulkStatus}
        bulkFkUtIdx={bulkFkUtIdx}
        setBulkFkUtIdx={setBulkFkUtIdx}
        bulkWage={bulkWage}
        setBulkWage={setBulkWage}
        userTypes={userTypes}
        onSave={handleBulkSave}
      />

      <EditUserModal
        editUser={editUser}
        onHide={() => setEditUser(null)}
        editError={editError}
        editSuccess={editSuccess}
        editUserName={editUserName}
        setEditUserName={setEditUserName}
        editEmail={editEmail}
        setEditEmail={setEditEmail}
        editPhone={editPhone}
        setEditPhone={setEditPhone}
        editBranch={editBranch}
        setEditBranch={setEditBranch}
        branches={branches}
        editFkUtIdx={editFkUtIdx}
        setEditFkUtIdx={setEditFkUtIdx}
        userTypes={userTypes}
        me={me}
        canViewSensitive={canViewSensitive}
        canEditSensitive={canEditSensitive}
        banks={banks}
        editBank={editBank}
        setEditBank={setEditBank}
        editAccountName={editAccountName}
        setEditAccountName={setEditAccountName}
        editAccountNo={editAccountNo}
        setEditAccountNo={setEditAccountNo}
        sensitiveDataLoaded={sensitiveDataLoaded}
        sensitiveLoading={sensitiveLoading}
        handleRevealSensitive={handleRevealSensitive}
        editWage={editWage}
        setEditWage={setEditWage}
        handleToggleActive={handleToggleActive}
        onOpenTempPw={() => { setTempPwUser(editUser); setTempPwValue(''); setTempPwMsg(''); }}
        handleEditSave={handleEditSave}
        editSaving={editSaving}
      />

      <TempPasswordModal
        tempPwUser={tempPwUser}
        onHide={() => setTempPwUser(null)}
        tempPwMsg={tempPwMsg}
        tempPwValue={tempPwValue}
        setTempPwValue={setTempPwValue}
        handleSetTempPw={handleSetTempPw}
        tempPwSaving={tempPwSaving}
      />

      <AddUserModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        addError={addError}
        addSuccess={addSuccess}
        addUserRole={addUserRole}
        setAddUserRole={setAddUserRole}
        setAddFkUtIdx={setAddFkUtIdx}
        addWorkPlaceIdx={addWorkPlaceIdx}
        setAddWorkPlaceIdx={setAddWorkPlaceIdx}
        branches={branches}
        addFkUtIdx={addFkUtIdx}
        userTypes={userTypes}
        addUserId={addUserId}
        setAddUserId={setAddUserId}
        addUserPw={addUserPw}
        setAddUserPw={setAddUserPw}
        addUserName={addUserName}
        setAddUserName={setAddUserName}
        addUserBirth={addUserBirth}
        setAddUserBirth={setAddUserBirth}
        addUserPhone={addUserPhone}
        setAddUserPhone={setAddUserPhone}
        handleAddUser={handleAddUser}
        addSaving={addSaving}
      />

      <ArchiveReasonModal
        show={showReasonModal}
        onHide={() => { setShowReasonModal(false); setIsArchivedMode(false); }}
        archiveReason={archiveReason}
        setArchiveReason={setArchiveReason}
        onSubmit={() => {
          if (!archiveReason.trim()) {
            alert('조회 사유를 입력해주세요.');
            return;
          }
          setShowReasonModal(false);
          setIsArchivedMode(true);
          setPage(0);
          setPageInput('1');
        }}
      />

      {ExcelDownloadProgressModal}
    </div>
  );
};

export default AdminUsers;
