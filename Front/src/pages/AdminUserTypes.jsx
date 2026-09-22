import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Spinner, Modal, Form, Badge, Alert } from 'react-bootstrap';
import { fetchUserTypes, createUserType, updateUserType, deleteUserType } from '../api/authApi';
import useAuthStore from '../store/useAuthStore';
import { RiAddLine, RiUserStarLine } from 'react-icons/ri';
import './AdminMain.css';
import Loading from '../components/Loading';

const AdminUserTypes = () => {
  const { user: me } = useAuthStore();
  const myUtIdx = me?.fkUtIdx;
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // 폼 필드
  const [utName, setUtName] = useState('');
  const [utIsAdmin, setUtIsAdmin] = useState(0);
  const [utIsSuperAdmin, setUtIsSuperAdmin] = useState(0);
  
  const [utCanAccessArchive, setUtCanAccessArchive] = useState(0);
  const [utCanViewSensitive, setUtCanViewSensitive] = useState(0);
  const [utCanEditSensitive, setUtCanEditSensitive] = useState(0);
  const [utCanExportExcel, setUtCanExportExcel] = useState(0);
  const [utCanManageRoles, setUtCanManageRoles] = useState(0);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadUserTypes = async () => {
    setLoading(true);
    const res = await fetchUserTypes();
    if (res.success) {
      setUserTypes(res.data);
    } else {
      setUserTypes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUserTypes();
  }, []);

  const handleOpenAdd = () => {
    setEditMode(false);
    setCurrentId(null);
    setUtName('');
    setUtIsAdmin(0);
    setUtIsSuperAdmin(0);
    setUtCanAccessArchive(0);
    setUtCanViewSensitive(0);
    setUtCanEditSensitive(0);
    setUtCanExportExcel(0);
    setUtCanManageRoles(0);
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (ut) => {
    setEditMode(true);
    setCurrentId(ut.utIdx);
    setUtName(ut.utName || '');
    setUtIsAdmin(ut.utIsAdmin || 0);
    setUtIsSuperAdmin(ut.utIsSuperAdmin || 0);
    setUtCanAccessArchive(ut.utCanAccessArchive || 0);
    setUtCanViewSensitive(ut.utCanViewSensitive || 0);
    setUtCanEditSensitive(ut.utCanEditSensitive || 0);
    setUtCanExportExcel(ut.utCanExportExcel || 0);
    setUtCanManageRoles(ut.utCanManageRoles || 0);
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!utName.trim()) {
      setErrorMsg('직급명을 입력해주세요.');
      return;
    }
    
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    const payload = {
      utName,
      utIsAdmin: Number(utIsAdmin),
      utIsSuperAdmin: Number(utIsSuperAdmin),
      utCanAccessArchive: Number(utCanAccessArchive),
      utCanViewSensitive: Number(utCanViewSensitive),
      utCanEditSensitive: Number(utCanEditSensitive),
      utCanExportExcel: Number(utCanExportExcel),
      utCanManageRoles: Number(utCanManageRoles)
    };

    let res;
    if (editMode) {
      res = await updateUserType(currentId, payload);
    } else {
      res = await createUserType(payload);
    }

    setSaving(false);
    if (res.success) {
      setSuccessMsg(editMode ? '수정되었습니다.' : '추가되었습니다.');
      loadUserTypes();
      setTimeout(() => setShowModal(false), 1000);
    } else {
      setErrorMsg(res.error || '저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`'${name}' 직급을 삭제하시겠습니까?`)) return;
    const res = await deleteUserType(id);
    if (res.success) {
      loadUserTypes();
    } else {
      alert(res.error || '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="admin-container">
      <Container className="py-4 py-md-5">
        <div className="admin-header-card">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h2 className="fw-bold text-dark mb-1">직급 및 권한 관리</h2>
              <p className="text-muted small mb-0">직원 역할 및 관리자 접근 권한을 설정합니다.</p>
            </div>
            <Button variant="primary" className="fw-bold px-4 py-2 rounded-pill shadow-xs d-flex align-items-center gap-1" onClick={handleOpenAdd}>
              <RiAddLine size={18} /> 새 직급 추가
            </Button>
          </div>
        </div>

        {loading ? <Loading /> : (
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="custom-table align-middle mb-0 text-center">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>ID</th>
                      <th>직급명</th>
                      <th>권한 등급</th>
                      <th style={{ width: '140px' }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTypes.map(ut => {
                      const isMyRole = Number(ut.utIdx) === Number(myUtIdx);
                      return (
                      <tr key={ut.utIdx}>
                        <td className="text-muted fw-semibold">{ut.utIdx}</td>
                        <td className="fw-bold text-dark">
                          {ut.utName}
                          {isMyRole && <Badge bg="info" className="ms-2">내 직급</Badge>}
                        </td>
                        <td>
                          {ut.utIsAdmin === 1 
                            ? <Badge bg="danger" className="px-3 py-1">관리자 권한</Badge> 
                            : <Badge bg="secondary" className="px-3 py-1">일반 직원</Badge>}
                        </td>
                        <td>
                          {isMyRole ? (
                            <div className="text-muted small">본인 직급은 수정할 수 없습니다</div>
                          ) : (
                            <div className="d-flex justify-content-center gap-2">
                              <Button size="sm" variant="outline-primary" className="rounded-pill fw-bold px-3" onClick={() => handleOpenEdit(ut)}>수정</Button>
                              <Button size="sm" variant="outline-danger" className="rounded-pill fw-bold px-3" onClick={() => handleDelete(ut.utIdx, ut.utName)}>삭제</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                    {userTypes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-5 text-muted">
                          <RiUserStarLine size={36} className="opacity-50 mb-2" />
                          <p className="mb-0">등록된 직급이 없습니다.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        )}
      </Container>

      {/* 추가/수정 모달 */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold text-dark fs-5">{editMode ? '직급 수정' : '새 직급 추가'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {errorMsg && <Alert variant="danger" className="py-2 rounded-3 text-center">{errorMsg}</Alert>}
          {successMsg && <Alert variant="success" className="py-2 rounded-3 text-center">{successMsg}</Alert>}
          
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">직급명 *</Form.Label>
            <Form.Control 
              value={utName} 
              onChange={e => setUtName(e.target.value)} 
              placeholder="예: 파트타임, 홀매니저, 정규직 등"
              className="custom-input"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">권한 설정 (관리자 기능 접근)</Form.Label>
            <Form.Select 
              value={utIsAdmin} 
              onChange={e => {
                const val = Number(e.target.value);
                setUtIsAdmin(val);
                if (val === 0) {
                  setUtCanAccessArchive(0);
                  setUtCanViewSensitive(0);
                  setUtCanEditSensitive(0);
                  setUtCanExportExcel(0);
                  setUtCanManageRoles(0);
                }
              }} 
              className="custom-input"
            >
              <option value={0}>일반 알바생 / 직원 (관리자 기능 제한)</option>
              <option value={1}>관리자 (관리자 대시보드 접근 허용)</option>
            </Form.Select>
          </Form.Group>

          {utIsAdmin === 1 && (
            <div className="bg-light p-3 rounded-3 mb-3 border">
              <div className="fw-bold text-dark small mb-3">관리자 세부 권한</div>
              <Form.Check 
                type="switch" 
                id="archive-switch"
                label="아카이빙(1년 경과 퇴사자) 조회 권한" 
                checked={utCanAccessArchive === 1}
                onChange={e => setUtCanAccessArchive(e.target.checked ? 1 : 0)}
                className="mb-2"
              />
              <Form.Check 
                type="switch" 
                id="sensitive-view-switch"
                label="직원 민감정보(시급/계좌) 조회 권한" 
                checked={utCanViewSensitive === 1}
                onChange={e => setUtCanViewSensitive(e.target.checked ? 1 : 0)}
                className="mb-2"
              />
              <Form.Check 
                type="switch" 
                id="sensitive-edit-switch"
                label="직원 민감정보(시급/계좌) 수정 권한" 
                checked={utCanEditSensitive === 1}
                onChange={e => setUtCanEditSensitive(e.target.checked ? 1 : 0)}
                className="mb-2"
              />
              <Form.Check 
                type="switch" 
                id="excel-switch"
                label="엑셀 다운로드 권한" 
                checked={utCanExportExcel === 1}
                onChange={e => setUtCanExportExcel(e.target.checked ? 1 : 0)}
                className="mb-2"
              />
              <Form.Check 
                type="switch" 
                id="role-switch"
                label="직급 및 권한 설정 관리 권한" 
                checked={utCanManageRoles === 1}
                onChange={e => setUtCanManageRoles(e.target.checked ? 1 : 0)}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} className="rounded-3">닫기</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving} className="rounded-3 px-3">
            {saving ? <Spinner as="span" animation="border" size="sm" /> : '저장'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminUserTypes;
