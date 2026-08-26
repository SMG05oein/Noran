import React, { useState, useEffect, useMemo } from 'react';
import { Container, ButtonGroup, ToggleButton, Card, Table, Button, Spinner, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { fetchAdminWorkers, fetchAdminManagers, updateUserInfo, setTempPassword, deleteUser, restoreUser, getSensitiveInfo, updateSensitiveInfo, hardDeleteUser, fetchWorkPlaces, fetchUserTypes } from '../api/authApi';
import PaginationBar from '../components/PaginationBar';
import './AdminMain.css';

const AdminUsers = () => {
  const [selectedRole, setSelectedRole] = useState('알바생');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 페이징 상태
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageInput, setPageInput] = useState('1');

  // 기본 정보 수정 모달
  const [editUser, setEditUser] = useState(null);
  const [editUserName, setEditUserName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBranch, setEditBranch] = useState(1);
  const [editFkUtIdx, setEditFkUtIdx] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // 임시 비번 모달
  const [tempPwUser, setTempPwUser] = useState(null);
  const [tempPwValue, setTempPwValue] = useState('');
  const [tempPwSaving, setTempPwSaving] = useState(false);
  const [tempPwMsg, setTempPwMsg] = useState('');

  // 민감정보 모달
  const [sensitiveUser, setSensitiveUser] = useState(null);
  const [sensitiveData, setSensitiveData] = useState(null); // 원문 (getSensitiveInfo 호출 후)
  const [sensitiveLoading, setSensitiveLoading] = useState(false);
  const [editSensitive, setEditSensitive] = useState(false);
  const [sensitiveAccountName, setSensitiveAccountName] = useState('');
  const [sensitiveAccountNo, setSensitiveAccountNo] = useState('');
  const [sensitiveBank, setSensitiveBank] = useState('');
  const [sensitiveWage, setSensitiveWage] = useState('');
  const [sensitiveSaving, setSensitiveSaving] = useState(false);
  const [sensitiveMsg, setSensitiveMsg] = useState('');

  const [branches, setBranches] = useState([{ wpIdx: '', wpName: '전체' }]);
  const [userTypes, setUserTypes] = useState([]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = { size: 10, page, showInactive };
      if (selectedBranch) {
        params.workPlaceIdx = Number(selectedBranch);
      }
      if (searchName) {
        params.userName = searchName;
      }

      let res;
      if (selectedRole === '알바생') {
        res = await fetchAdminWorkers(params);
      } else {
        res = await fetchAdminManagers(params);
      }

      if (res.success && res.data?.content !== undefined) {
        setUsers(res.data.content);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
      } else if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
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

  const loadBranches = async () => {
    const branchRes = await fetchWorkPlaces();
    if (branchRes.success) {
      setBranches([{ wpIdx: '', wpName: '전체' }, ...branchRes.data]);
    }
  };

  useEffect(() => {
    loadBranches();
    const loadUserTypes = async () => {
      const res = await fetchUserTypes();
      if (res.success) setUserTypes(res.data);
    };
    loadUserTypes();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [selectedRole, page, selectedBranch, showInactive]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setPageInput('1');
    loadUsers();
  };

  const openEditModal = (u) => {
    setEditUser(u);
    setEditUserName(u.userName || '');
    setEditEmail(u.userEmail || '');
    setEditPhone(u.userPhone || '');
    setEditBranch(u.workPlaceName?.includes('영등포') ? 2 : 1);
    setEditFkUtIdx('');
    setEditError('');
    setEditSuccess('');
  };

  const handleEditSave = async () => {
    setEditError('');
    setEditSuccess('');
    setEditSaving(true);
    const payload = {
      userName: editUserName,
      userEmail: editEmail,
      userPhone: editPhone,
      fkWorkPlaceIdx: editBranch,
    };
    if (editFkUtIdx) payload.fkUtIdx = Number(editFkUtIdx);
    const res = await updateUserInfo(editUser.userIdx, payload);
    setEditSaving(false);
    if (res.success) {
      setEditSuccess('수정되었습니다.');
      loadUsers();
    } else {
      setEditError(res.error || '수정에 실패했습니다.');
    }
  };

  const handleToggleActive = async (u) => {
    const isActivating = u.userIsActive !== 1;
    const confirmMsg = isActivating
      ? `'${u.userName}' 직원을 복구하시겠습니까?`
      : `'${u.userName}' 직원을 비활성화(퇴사 처리)하시겠습니까?`;

    if (!window.confirm(confirmMsg)) return;

    const res = isActivating ? await restoreUser(u.userIdx) : await deleteUser(u.userIdx);
    if (res.success) {
      alert(res.data);
      loadUsers();
    } else {
      alert(res.error || '상태 변경에 실패했습니다.');
    }
  };

  const handleHardDelete = async (u) => {
    if (!window.confirm(`'${u.userName}' 직원의 모든 데이터를 영구 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다!`)) return;

    const res = await hardDeleteUser(u.userIdx);
    if (res.success) {
      alert(res.data || '영구 삭제되었습니다.');
      loadUsers();
    } else {
      alert(res.error || '영구 삭제에 실패했습니다.');
    }
  };

  const handleSetTempPw = async () => {
    if (!tempPwValue.trim()) return setTempPwMsg('임시 비밀번호를 입력해주세요.');
    setTempPwSaving(true);
    setTempPwMsg('');
    const res = await setTempPassword(tempPwUser.userIdx, tempPwValue);
    setTempPwSaving(false);
    setTempPwMsg(res.success ? '임시 비밀번호가 설정되었습니다!' : (res.error || '실패했습니다.'));
    if (res.success) setTempPwValue('');
  };

  // 민감정보 모달 열기 - 마스킹 상태로 먼저 보여줌 (원문 API 호출 안 함)
  const openSensitiveModal = (u) => {
    setSensitiveUser(u);
    setSensitiveData(null); // 원문 충기화
    setEditSensitive(false);
    setSensitiveMsg('');
    // 수정 폼 초기값도 마스킹 기준
    setSensitiveAccountName(u.userAccountName || '');
    setSensitiveAccountNo(u.userAccountNumber || '');
    setSensitiveBank(u.userBank || '');
    setSensitiveWage(u.userHourlyWage ? String(u.userHourlyWage) : '');
  };

  // '원문 보기' 당신만 원문 호출
  const handleRevealSensitive = async () => {
    if (!sensitiveUser) return;
    setSensitiveLoading(true);
    const res = await getSensitiveInfo(sensitiveUser.userIdx);
    setSensitiveLoading(false);
    if (res.success) {
      setSensitiveData(res.data);
      setSensitiveAccountName(res.data.userAccountName || '');
      setSensitiveAccountNo(res.data.userAccountNumber || '');
      setSensitiveBank(res.data.userBank || '');
      setSensitiveWage(res.data.userHourlyWage ? String(res.data.userHourlyWage) : '');
    } else {
      setSensitiveMsg(res.error || '원문 조회 실패');
    }
  };

  const handleSensitiveSave = async () => {
    setSensitiveSaving(true);
    setSensitiveMsg('');
    const res = await updateSensitiveInfo(sensitiveUser.userIdx, {
      userAccountName: sensitiveAccountName,
      userAccountNumber: sensitiveAccountNo,
      userBank: sensitiveBank,
      userHourlyWage: sensitiveWage ? Number(sensitiveWage) : null,
    });
    setSensitiveSaving(false);
    setSensitiveMsg(res.success ? '저장되었습니다!' : (res.error || '저장 실패'));
    if (res.success) {
      setEditSensitive(false);
      loadUsers();
    }
  };

  const renderSensitiveValue = (val) => {
    if (!val) {
      return <Badge bg="danger" className="fw-bold px-3 py-1 rounded-pill shadow-sm" style={{ fontSize: '1rem' }}>미기재</Badge>;
    } else if (val === "기재") {
      return <Badge bg="success" className="fw-bold px-3 py-1 rounded-pill shadow-sm" style={{ fontSize: '1rem' }}>기재</Badge>;
    }
    return <span className="text-dark fw-bold">{val}</span>;
  };

  return (
    <div className="admin-container">
      <Container className="py-4 py-md-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
          <h2 className="fw-bold text-dark mb-2 mb-md-0">직원 관리</h2>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Form.Check
              type="switch"
              id="show-inactive-switch"
              label="퇴사자 포함"
              checked={showInactive}
              onChange={e => {
                setShowInactive(e.target.checked);
                setPage(0);
                setPageInput('1');
              }}
              className="fw-bold me-3"
            />
            <ButtonGroup className="me-2 shadow-sm">
              <ToggleButton
                id="role-worker"
                type="radio"
                variant={selectedRole === '알바생' ? "primary" : "outline-primary"}
                name="roleRadio"
                value="알바생"
                checked={selectedRole === '알바생'}
                onChange={e => {
                  setSelectedRole(e.currentTarget.value);
                  setPage(0);
                  setPageInput('1');
                }}
                className="px-3 fw-bold"
              >
                알바생
              </ToggleButton>
              <ToggleButton
                id="role-admin"
                type="radio"
                variant={selectedRole === '직원' ? "danger" : "outline-danger"}
                name="roleRadio"
                value="직원"
                checked={selectedRole === '직원'}
                onChange={e => {
                  setSelectedRole(e.currentTarget.value);
                  setPage(0);
                  setPageInput('1');
                }}
                className="px-3 fw-bold"
              >
                직원
              </ToggleButton>
            </ButtonGroup>
            <ButtonGroup className="shadow-sm">
              {branches.map((b, idx) => (
                <ToggleButton
                  key={idx}
                  id={`user-branch-${idx}`}
                  type="radio"
                  variant={selectedBranch === (b.wpIdx !== null && b.wpIdx !== undefined ? String(b.wpIdx) : '') ? "primary" : "outline-primary"}
                  name="userBranchRadio"
                  value={b.wpIdx !== null && b.wpIdx !== undefined ? String(b.wpIdx) : ''}
                  checked={selectedBranch === (b.wpIdx !== null && b.wpIdx !== undefined ? String(b.wpIdx) : '')}
                  onChange={e => {
                    setSelectedBranch(e.currentTarget.value);
                    setPage(0);
                    setPageInput('1');
                  }}
                  className="px-3 fw-bold"
                >
                  {b.wpName}
                </ToggleButton>
              ))}
            </ButtonGroup>
          </div>
        </div>

        <div className="d-flex justify-content-end mb-4">
          <Form onSubmit={handleSearch} className="d-flex w-100" style={{ maxWidth: '300px' }}>
            <Form.Control
              type="text"
              placeholder="이름 검색"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="me-2"
              disabled={selectedRole === '직원'}
            />
            <Button type="submit" variant="primary" className="fw-bold text-nowrap" disabled={selectedRole === '직원'}>
              검색
            </Button>
          </Form>
        </div>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <>
            {selectedRole === '직원' && (
              <Card className="border-0 shadow-sm rounded-4 mb-4">
                <Card.Header className="bg-white border-0 pt-4 pb-2 px-4">
                  <h5 className="fw-bold mb-0 text-danger">관리자 목록</h5>
                </Card.Header>
                <Card.Body className="p-4 pt-0">
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0 text-center">
                      <thead className="table-light">
                        <tr>
                          <th>No</th>
                          <th>이름</th>
                          <th>아이디</th>
                          <th>소속</th>
                          <th>직급</th>
                          <th>시급</th>
                          <th>연락처</th>
                          <th>상태</th>
                          <th>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u, idx) => (
                          <tr key={u.userIdx} className={u.userIsActive !== 1 ? 'table-secondary text-muted' : ''}>
                            <td className="fw-bold text-muted">{page * 10 + idx + 1}</td>
                            <td className="fw-bold">{u.userName}</td>
                            <td className="text-muted small">{u.userId}</td>
                            <td>{u.workPlaceName || '-'}</td>
                            <td><Badge bg="danger">{u.userTypeName || '관리자'}</Badge></td>
                            <td className="small">{u.userHourlyWage ? `${u.userHourlyWage.toLocaleString()}원` : '-'}</td>
                            <td className="small">{u.userPhone || '-'}</td>
                            <td>
                              {u.userIsActive === 1 ? <Badge bg="success">재직</Badge> : <Badge bg="dark">퇴사</Badge>}
                            </td>
                            <td>
                              <div className="d-flex justify-content-center gap-1 flex-wrap">
                                <Button size="sm" variant="outline-primary" className="rounded-pill fw-bold" onClick={() => openEditModal(u)}>수정</Button>
                                <Button size="sm" variant="outline-secondary" className="rounded-pill fw-bold" onClick={() => { setSensitiveUser(u); setSensitiveData(null); setSensitiveMsg(''); setEditSensitive(false); }}>민감정보</Button>
                                <Button size="sm" variant="outline-warning" className="rounded-pill fw-bold" onClick={() => { setTempPwUser(u); setTempPwValue(''); setTempPwMsg(''); }}>임시PW</Button>
                                <Button size="sm" variant={u.userIsActive === 1 ? 'outline-danger' : 'outline-success'} className="rounded-pill fw-bold" onClick={() => handleToggleActive(u)}>
                                  {u.userIsActive === 1 ? '비활성화' : '복구'}
                                </Button>
                                <Button size="sm" variant="danger" className="rounded-pill fw-bold text-white" onClick={() => handleHardDelete(u)}>영구삭제</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={9} className="text-center py-5 text-muted">해당하는 관리자가 없습니다.</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            )}

            {selectedRole === '알바생' && (
              <Card className="border-0 shadow-sm rounded-4">
                <Card.Header className="bg-white border-0 pt-4 pb-2 px-4">
                  <h5 className="fw-bold mb-0 text-primary">알바생 목록</h5>
                </Card.Header>
                <Card.Body className="p-4 pt-0">
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0 text-center">
                      <thead className="table-light">
                        <tr>
                          <th>No</th>
                          <th>이름</th>
                          <th>아이디</th>
                          <th>소속</th>
                          <th>직급</th>
                          <th>시급</th>
                          <th>연락처</th>
                          <th>상태</th>
                          <th>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u, idx) => (
                          <tr key={u.userIdx} className={u.userIsActive !== 1 ? 'table-secondary text-muted' : ''}>
                            <td className="fw-bold text-muted">{page * 10 + idx + 1}</td>
                            <td className="fw-bold">{u.userName}</td>
                            <td className="text-muted small">{u.userId}</td>
                            <td>{u.workPlaceName || '-'}</td>
                            <td><Badge bg="secondary">{u.userTypeName || '알바생'}</Badge></td>
                            <td className="small">{u.userHourlyWage ? `${u.userHourlyWage.toLocaleString()}원` : '-'}</td>
                            <td className="small">{u.userPhone || '-'}</td>
                            <td>
                              {u.userIsActive === 1 ? <Badge bg="success">재직</Badge> : <Badge bg="dark">퇴사</Badge>}
                            </td>
                            <td>
                              <div className="d-flex justify-content-center gap-1 flex-wrap">
                                <Button size="sm" variant="outline-primary" className="rounded-pill fw-bold" onClick={() => openEditModal(u)}>수정</Button>
                                <Button size="sm" variant="outline-secondary" className="rounded-pill fw-bold" onClick={() => { setSensitiveUser(u); setSensitiveData(null); setSensitiveMsg(''); setEditSensitive(false); }}>민감정보</Button>
                                <Button size="sm" variant="outline-warning" className="rounded-pill fw-bold" onClick={() => { setTempPwUser(u); setTempPwValue(''); setTempPwMsg(''); }}>임시PW</Button>
                                <Button size="sm" variant={u.userIsActive === 1 ? 'outline-danger' : 'outline-success'} className="rounded-pill fw-bold" onClick={() => handleToggleActive(u)}>
                                  {u.userIsActive === 1 ? '비활성화' : '복구'}
                                </Button>
                                <Button size="sm" variant="danger" className="rounded-pill fw-bold text-white" onClick={() => handleHardDelete(u)}>영구삭제</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={9} className="text-center py-5 text-muted">해당하는 직원이 없습니다.</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            )}
          </>
        )}

        {!loading && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            pageInput={pageInput}
            setPage={setPage}
            setPageInput={setPageInput}
          />
        )}
      </Container>

      {/* 기본 정보 수정 모달 */}
      <Modal show={!!editUser} onHide={() => setEditUser(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">✏️ {editUser?.userName} 정보 수정</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editError && <Alert variant="danger" className="py-2">{editError}</Alert>}
          {editSuccess && <Alert variant="success" className="py-2">{editSuccess}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">이름</Form.Label>
            <Form.Control value={editUserName} onChange={e => setEditUserName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">이메일</Form.Label>
            <Form.Control type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">전화번호</Form.Label>
            <Form.Control value={editPhone} onChange={e => setEditPhone(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">소속 지점</Form.Label>
            <Form.Select value={editBranch} onChange={e => setEditBranch(Number(e.target.value))}>
              <option value={1}>노란돼지 (사당)</option>
              <option value={2}>약산돼지 (영등포)</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label className="fw-bold text-muted small">직급 변경 (관리자 전용, 비워두면 유지)</Form.Label>
            <Form.Select value={editFkUtIdx} onChange={e => setEditFkUtIdx(e.target.value)}>
              <option value="">-- 변경 안 함 --</option>
              {userTypes.map(ut => (
                <option key={ut.utIdx} value={ut.utIdx}>{ut.utName}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditUser(null)}>닫기</Button>
          <Button variant="primary" onClick={handleEditSave} disabled={editSaving} style={{ backgroundColor: '#d35400', border: 'none' }}>
            {editSaving ? <Spinner as="span" animation="border" size="sm" /> : '저장'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 민감정보 모달 */}
      <Modal show={!!sensitiveUser} onHide={() => setSensitiveUser(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">🔒 {sensitiveUser?.userName} 민감 정보</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {sensitiveMsg && (
            <Alert variant={sensitiveMsg.includes('저장') || sensitiveMsg.includes('!') ? 'success' : 'danger'} className="py-2">{sensitiveMsg}</Alert>
          )}
          {sensitiveLoading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : editSensitive ? (
            <div className="bg-light p-4 rounded-4 shadow-sm border border-white">
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">🏦 은행명</Form.Label>
                <Form.Control className="border-0 shadow-sm" value={sensitiveBank} onChange={e => setSensitiveBank(e.target.value)} placeholder="예: 카카오뱅크" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">👤 예금주명</Form.Label>
                <Form.Control className="border-0 shadow-sm" value={sensitiveAccountName} onChange={e => setSensitiveAccountName(e.target.value)} placeholder="예금주 명" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">🔢 계좌번호 (숫자만)</Form.Label>
                <Form.Control className="border-0 shadow-sm" value={sensitiveAccountNo} onChange={e => setSensitiveAccountNo(e.target.value)} placeholder="계좌번호 (숫자만)" />
              </Form.Group>
              <Form.Group>
                <Form.Label className="fw-bold text-muted small">💰 시급 (원)</Form.Label>
                <Form.Control className="border-0 shadow-sm" type="number" value={sensitiveWage} onChange={e => setSensitiveWage(e.target.value)} placeholder="예: 10030" />
              </Form.Group>
            </div>
          ) : (
            <div className="bg-light p-4 rounded-4 shadow-sm border border-white">
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                <div className="text-muted fw-bold small">🏦 은행명</div>
                <div className="fs-5">
                  {renderSensitiveValue(sensitiveData ? sensitiveData.userBank : sensitiveUser?.userBank)}
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                <div className="text-muted fw-bold small">👤 예금주명</div>
                <div className="fs-5">
                  {renderSensitiveValue(sensitiveData ? sensitiveData.userAccountName : sensitiveUser?.userAccountName)}
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                <div className="text-muted fw-bold small">🔢 계좌번호</div>
                <div className="fs-5">
                  {renderSensitiveValue(sensitiveData ? sensitiveData.userAccountNumber : sensitiveUser?.userAccountNumber)}
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="text-muted fw-bold small">💰 시급</div>
                <div className="fs-5">
                  {renderSensitiveValue(
                    sensitiveData
                      ? (sensitiveData.userHourlyWage ? `${sensitiveData.userHourlyWage.toLocaleString()}원` : null)
                      : (sensitiveUser?.userHourlyWage ? `${sensitiveUser.userHourlyWage.toLocaleString()}원` : null)
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!sensitiveLoading && (
            editSensitive ? (
              <>
                <Button variant="secondary" onClick={() => setEditSensitive(false)}>취소</Button>
                <Button variant="primary" onClick={handleSensitiveSave} disabled={sensitiveSaving} style={{ backgroundColor: '#d35400', border: 'none' }}>
                  {sensitiveSaving ? <Spinner as="span" animation="border" size="sm" /> : '저장'}
                </Button>
              </>
            ) : (
              <>
                {!sensitiveData && (
                  <Button variant="outline-danger" onClick={handleRevealSensitive}>원문 조회</Button>
                )}
                <Button variant="outline-primary" onClick={() => {
                  if (!sensitiveData) {
                    setSensitiveMsg('먼저 원문 조회를 해야 수정할 수 있습니다.');
                  } else {
                    setEditSensitive(true);
                  }
                }}>수정</Button>
                <Button variant="secondary" onClick={() => setSensitiveUser(null)}>닫기</Button>
              </>
            )
          )}
        </Modal.Footer>
      </Modal>

      {/* 임시 비밀번호 설정 모달 */}
      <Modal show={!!tempPwUser} onHide={() => setTempPwUser(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">🔑 {tempPwUser?.userName} 임시 비밀번호 설정</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {tempPwMsg && (
            <Alert variant={tempPwMsg.includes('설정') ? 'success' : 'danger'} className="py-2">{tempPwMsg}</Alert>
          )}
          <Form.Group>
            <Form.Label className="fw-bold text-muted small">임시 비밀번호</Form.Label>
            <Form.Control
              type="text"
              value={tempPwValue}
              onChange={e => setTempPwValue(e.target.value)}
              placeholder="직원에게 알려줄 임시 비밀번호 입력"
            />
            <Form.Text className="text-muted">직원이 이 비밀번호로 로그인 후 본인이 비밀번호를 변경합니다.</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setTempPwUser(null)}>닫기</Button>
          <Button variant="warning" onClick={handleSetTempPw} disabled={tempPwSaving} className="fw-bold">
            {tempPwSaving ? <Spinner as="span" animation="border" size="sm" /> : '설정'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminUsers;
