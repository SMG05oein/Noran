import React, { useState, useEffect, useMemo } from 'react';
import { Container, ButtonGroup, ToggleButton, Card, Table, Button, Spinner, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { fetchAdminWorkers, fetchAdminManagers, updateUserInfo, setTempPassword, deleteUser, restoreUser, getSensitiveInfo, updateSensitiveInfo, hardDeleteUser, fetchWorkPlaces } from '../api/authApi';
import './AdminMain.css';

const AdminUsers = () => {
  const [selectedRole, setSelectedRole] = useState('직원');
  const [selectedBranch, setSelectedBranch] = useState('전체');
  const [showInactive, setShowInactive] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const [sensitiveResidentNo, setSensitiveResidentNo] = useState('');
  const [sensitiveAccountNo, setSensitiveAccountNo] = useState('');
  const [sensitiveBank, setSensitiveBank] = useState('');
  const [sensitiveWage, setSensitiveWage] = useState('');
  const [sensitiveSaving, setSensitiveSaving] = useState(false);
  const [sensitiveMsg, setSensitiveMsg] = useState('');

  const [branches, setBranches] = useState(['전체']);

  const loadUsers = async () => {
    setLoading(true);

    try {
      if (selectedRole === '직원') {
        const res = await fetchAdminWorkers({ size: 10, userName: searchName || undefined });
        if (res.success && res.data?.content) {
          setUsers(res.data.content);
        } else {
          setUsers([]);
        }
      } else {
        const res = await fetchAdminManagers({ size: 10 });
        if (res.success && res.data?.content) {
          setUsers(res.data.content);
        } else {
          setUsers([]);
        }
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
      setBranches(['전체', ...branchRes.data.map(b => b.wpName)]);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [selectedRole]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const { adminUsers, workerUsers } = useMemo(() => {
    const filtered = users.filter(u => {
      const branchOk = selectedBranch === '전체' || (u.workPlaceName && u.workPlaceName.includes(selectedBranch));
      const activeOk = showInactive ? true : u.userIsActive === 1;
      return branchOk && activeOk;
    });

    return {
      adminUsers: selectedRole === '관리자' ? filtered : [],
      workerUsers: selectedRole === '직원' ? filtered : []
    };
  }, [users, selectedBranch, showInactive, selectedRole]);

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
    setSensitiveResidentNo('');
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
      setSensitiveResidentNo(res.data.userResidentNumber || '');
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
      userResidentNumber: sensitiveResidentNo,
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
              onChange={e => setShowInactive(e.target.checked)}
              className="fw-bold me-3"
            />
            <ButtonGroup className="me-2 shadow-sm">
              <ToggleButton
                id="role-worker"
                type="radio"
                variant={selectedRole === '직원' ? "primary" : "outline-primary"}
                name="roleRadio"
                value="직원"
                checked={selectedRole === '직원'}
                onChange={e => setSelectedRole(e.currentTarget.value)}
                className="px-3 fw-bold"
              >
                직원
              </ToggleButton>
              <ToggleButton
                id="role-admin"
                type="radio"
                variant={selectedRole === '관리자' ? "danger" : "outline-danger"}
                name="roleRadio"
                value="관리자"
                checked={selectedRole === '관리자'}
                onChange={e => setSelectedRole(e.currentTarget.value)}
                className="px-3 fw-bold"
              >
                관리자
              </ToggleButton>
            </ButtonGroup>
            <ButtonGroup className="shadow-sm">
              {branches.map((b, idx) => (
                <ToggleButton
                  key={idx}
                  id={`user-branch-${idx}`}
                  type="radio"
                  variant={selectedBranch === b ? "primary" : "outline-primary"}
                  name="userBranchRadio"
                  value={b}
                  checked={selectedBranch === b}
                  onChange={e => setSelectedBranch(e.currentTarget.value)}
                  className="px-3 fw-bold"
                >
                  {b}
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
              disabled={selectedRole === '관리자'}
            />
            <Button type="submit" variant="primary" className="fw-bold text-nowrap" disabled={selectedRole === '관리자'}>
              검색
            </Button>
          </Form>
        </div>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <>
            {selectedRole === '관리자' && (
              <Card className="border-0 shadow-sm rounded-4 mb-4">
                <Card.Header className="bg-white border-0 pt-4 pb-2 px-4">
                  <h5 className="fw-bold mb-0 text-danger">관리자 목록</h5>
                </Card.Header>
                <Card.Body className="p-4 pt-0">
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0 text-center">
                      <thead className="table-light">
                        <tr>
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
                        {adminUsers.map(u => (
                          <tr key={u.userIdx} className={u.userIsActive !== 1 ? 'table-secondary text-muted' : ''}>
                            <td className="fw-bold">{u.userName}</td>
                            <td className="text-muted small">{u.userId}</td>
                            <td>{u.workPlaceName || '-'}</td>
                            <td><Badge bg="danger">관리자</Badge></td>
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
                        {adminUsers.length === 0 && (
                          <tr>
                            <td colSpan={8} className="text-center py-5 text-muted">해당하는 관리자가 없습니다.</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            )}

            {selectedRole === '직원' && (
              <Card className="border-0 shadow-sm rounded-4">
                <Card.Header className="bg-white border-0 pt-4 pb-2 px-4">
                  <h5 className="fw-bold mb-0 text-primary">직원 목록</h5>
                </Card.Header>
                <Card.Body className="p-4 pt-0">
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0 text-center">
                      <thead className="table-light">
                        <tr>
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
                        {workerUsers.map(u => (
                          <tr key={u.userIdx} className={u.userIsActive !== 1 ? 'table-secondary text-muted' : ''}>
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
                        {workerUsers.length === 0 && (
                          <tr>
                            <td colSpan={8} className="text-center py-5 text-muted">해당하는 직원이 없습니다.</td>
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
              <option value="5">알바생 (기본)</option>
              <option value="4">파트타임</option>
              <option value="3">정규직</option>
              <option value="2">부점장</option>
              <option value="1">점장/관리자</option>
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
            <div className="text-center py-3"><Spinner animation="border" /></div>
          ) : editSensitive ? (
            <>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">주민등록번호</Form.Label>
                <Form.Control value={sensitiveResidentNo} onChange={e => setSensitiveResidentNo(e.target.value)} placeholder="XXXXXX-XXXXXXX" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">은행</Form.Label>
                <Form.Control value={sensitiveBank} onChange={e => setSensitiveBank(e.target.value)} placeholder="예: 카카오뱅크" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">계좌번호</Form.Label>
                <Form.Control value={sensitiveAccountNo} onChange={e => setSensitiveAccountNo(e.target.value)} placeholder="계좌번호 (숫자만)" />
              </Form.Group>
              <Form.Group>
                <Form.Label className="fw-bold text-muted small">시급 (원)</Form.Label>
                <Form.Control type="number" value={sensitiveWage} onChange={e => setSensitiveWage(e.target.value)} placeholder="예: 10030" />
              </Form.Group>
            </>
          ) : (
            <div className="small">
              <div className="mb-2 py-2 border-bottom d-flex justify-content-between">
                <span className="text-muted">주민등록번호</span>
                <strong>{sensitiveData ? (sensitiveData.userResidentNumber || '미기재') : (sensitiveUser?.userResidentNumber || '미기재')}</strong>
              </div>
              <div className="mb-2 py-2 border-bottom d-flex justify-content-between">
                <span className="text-muted">은행</span>
                <strong>{sensitiveData ? (sensitiveData.userBank || '미기재') : (sensitiveUser?.userBank || '미기재')}</strong>
              </div>
              <div className="mb-2 py-2 border-bottom d-flex justify-content-between">
                <span className="text-muted">계좌번호</span>
                <strong>{sensitiveData ? (sensitiveData.userAccountNumber || '미기재') : (sensitiveUser?.userAccountNumber || '미기재')}</strong>
              </div>
              <div className="py-2 d-flex justify-content-between align-items-center">
                <span className="text-muted">시급</span>
                <div className="d-flex align-items-center gap-2">
                  <strong>
                    {sensitiveData
                      ? (sensitiveData.userHourlyWage ? `${sensitiveData.userHourlyWage.toLocaleString()}원` : '미기재')
                      : (sensitiveUser?.userHourlyWage ? `${sensitiveUser.userHourlyWage.toLocaleString()}원` : '미기재')}
                  </strong>
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
