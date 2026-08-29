import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Spinner, Modal, Form, Badge, Alert } from 'react-bootstrap';
import { fetchUserTypes, createUserType, updateUserType, deleteUserType } from '../api/authApi';
import { RiAddLine, RiUserStarLine } from 'react-icons/ri';
import './AdminMain.css';

const AdminUserTypes = () => {
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
      utIsSuperAdmin: Number(utIsSuperAdmin)
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

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
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
                    {userTypes.map(ut => (
                      <tr key={ut.utIdx}>
                        <td className="text-muted fw-semibold">{ut.utIdx}</td>
                        <td className="fw-bold text-dark">{ut.utName}</td>
                        <td>
                          {ut.utIsAdmin === 1 
                            ? <Badge bg="danger" className="px-3 py-1">관리자 권한</Badge> 
                            : <Badge bg="secondary" className="px-3 py-1">일반 직원</Badge>}
                        </td>
                        <td>
                          <div className="d-flex justify-content-center gap-2">
                            <Button size="sm" variant="outline-primary" className="rounded-pill fw-bold px-3" onClick={() => handleOpenEdit(ut)}>수정</Button>
                            <Button size="sm" variant="outline-danger" className="rounded-pill fw-bold px-3" onClick={() => handleDelete(ut.utIdx, ut.utName)}>삭제</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
            <Form.Select value={utIsAdmin} onChange={e => setUtIsAdmin(e.target.value)} className="custom-input">
              <option value={0}>일반 알바생 / 직원 (관리자 기능 제한)</option>
              <option value={1}>관리자 (관리자 대시보드 접근 허용)</option>
            </Form.Select>
          </Form.Group>
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
