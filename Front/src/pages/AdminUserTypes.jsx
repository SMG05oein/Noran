import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Spinner, Modal, Form, Badge, Alert } from 'react-bootstrap';
import { fetchUserTypes, createUserType, updateUserType, deleteUserType } from '../api/authApi';
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
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
          <h2 className="fw-bold text-dark mb-2 mb-md-0">직급 관리</h2>
          <Button variant="primary" className="fw-bold px-4 rounded-pill" onClick={handleOpenAdd}>
            + 새 직급 추가
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Header className="bg-white border-0 pt-4 pb-2 px-4">
              <h5 className="fw-bold mb-0 text-primary">직급 목록</h5>
            </Card.Header>
            <Card.Body className="p-4 pt-0">
              <div className="table-responsive">
                <Table hover className="align-middle mb-0 text-center">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>직급명</th>
                      <th>관리자 여부</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTypes.map(ut => (
                      <tr key={ut.utIdx}>
                        <td className="text-muted small">{ut.utIdx}</td>
                        <td className="fw-bold">{ut.utName}</td>
                        <td>
                          {ut.utIsAdmin === 1 
                            ? <Badge bg="danger">관리자</Badge> 
                            : <Badge bg="secondary">일반</Badge>}
                        </td>
                        <td>
                          <div className="d-flex justify-content-center gap-1 flex-wrap">
                            <Button size="sm" variant="outline-primary" className="rounded-pill fw-bold" onClick={() => handleOpenEdit(ut)}>수정</Button>
                            <Button size="sm" variant="outline-danger" className="rounded-pill fw-bold" onClick={() => handleDelete(ut.utIdx, ut.utName)}>삭제</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {userTypes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-5 text-muted">등록된 직급이 없습니다.</td>
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
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">{editMode ? '✏️ 직급 수정' : '➕ 직급 추가'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorMsg && <Alert variant="danger" className="py-2">{errorMsg}</Alert>}
          {successMsg && <Alert variant="success" className="py-2">{successMsg}</Alert>}
          
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">직급명</Form.Label>
            <Form.Control 
              value={utName} 
              onChange={e => setUtName(e.target.value)} 
              placeholder="예: 파트타임, 정규직 등"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">권한 설정 (관리자 기능 접근)</Form.Label>
            <Form.Select value={utIsAdmin} onChange={e => setUtIsAdmin(e.target.value)}>
              <option value={0}>일반 알바생 / 직원 (관리자 페이지 접근 불가)</option>
              <option value={1}>관리자 (관리자 페이지 접근 가능)</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>닫기</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner as="span" animation="border" size="sm" /> : '저장'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminUserTypes;
