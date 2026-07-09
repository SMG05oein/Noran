import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Spinner, Modal, Form, InputGroup } from 'react-bootstrap';
import { fetchWorkPlaces, createWorkPlace, updateWorkPlace, deleteWorkPlace } from '../api/authApi';
import DaumPostcode from 'react-daum-postcode';
import './AdminMain.css';

const AdminWorkPlaces = () => {
  const [workPlaces, setWorkPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentWpIdx, setCurrentWpIdx] = useState(null);
  
  // 폼 상태
  const [wpName, setWpName] = useState('');
  const [wpAddress, setWpAddress] = useState('');
  const [wpAddressDetails, setWpAddressDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);

  const handleCompletePostcode = (data) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname;
      }
      if (data.buildingName !== '') {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    setWpAddress(fullAddress);
    setIsPostcodeOpen(false);
  };

  const loadData = async () => {
    setLoading(true);
    const res = await fetchWorkPlaces();
    if (res.success) {
      setWorkPlaces(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenCreate = () => {
    setEditMode(false);
    setCurrentWpIdx(null);
    setWpName('');
    setWpAddress('');
    setWpAddressDetails('');
    setShowModal(true);
  };

  const handleOpenEdit = (wp) => {
    setEditMode(true);
    setCurrentWpIdx(wp.wpIdx);
    setWpName(wp.wpName || '');
    setWpAddress(wp.wpAddress || '');
    setWpAddressDetails(wp.wpAddressDetails || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!wpName.trim()) {
      alert('지점명은 필수입니다.');
      return;
    }
    setSaving(true);
    const payload = { wpName, wpAddress, wpAddressDetails };
    
    let res;
    if (editMode) {
      res = await updateWorkPlace(currentWpIdx, payload);
    } else {
      res = await createWorkPlace(payload);
    }
    
    setSaving(false);
    if (res.success) {
      alert(res.data || '저장되었습니다.');
      setShowModal(false);
      loadData();
    } else {
      alert(res.error || '저장에 실패했습니다.');
    }
  };

  const handleDelete = async (wp) => {
    if (!window.confirm(`'${wp.wpName}' 지점을 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`)) return;
    
    const res = await deleteWorkPlace(wp.wpIdx);
    if (res.success) {
      alert(res.data || '삭제되었습니다.');
      loadData();
    } else {
      alert(res.error || '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="admin-container">
      <Container className="py-4 py-md-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
          <h2 className="fw-bold text-dark mb-2 mb-md-0">지점(근무지) 관리</h2>
          <Button variant="primary" className="fw-bold px-4 rounded-pill" onClick={handleOpenCreate}>
            + 새 지점 추가
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="p-4">
              {workPlaces.length === 0 ? (
                <div className="text-center text-muted py-5">
                  등록된 지점이 없습니다.
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>No.</th>
                        <th>지점명</th>
                        <th>주소</th>
                        <th>상세 주소</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workPlaces.map((wp, idx) => (
                        <tr key={wp.wpIdx}>
                          <td className="text-muted">{idx + 1}</td>
                          <td><span className="fw-bold text-primary">{wp.wpName}</span></td>
                          <td>{wp.wpAddress || '-'}</td>
                          <td>{wp.wpAddressDetails || '-'}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button size="sm" variant="outline-primary" className="rounded-pill fw-bold" onClick={() => handleOpenEdit(wp)}>
                                수정
                              </Button>
                              <Button size="sm" variant="outline-danger" className="rounded-pill fw-bold" onClick={() => handleDelete(wp)}>
                                삭제
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        )}
      </Container>

      {/* 추가/수정 모달 */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">{editMode ? '지점 수정' : '새 지점 추가'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">지점명 *</Form.Label>
              <Form.Control 
                type="text" 
                value={wpName} 
                onChange={e => setWpName(e.target.value)} 
                placeholder="예: 노란돼지" 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">주소</Form.Label>
              <InputGroup>
                <Form.Control 
                  type="text" 
                  value={wpAddress} 
                  onChange={e => setWpAddress(e.target.value)} 
                  placeholder="주소 검색을 이용해주세요" 
                  readOnly
                />
                <Button variant="outline-secondary" onClick={() => setIsPostcodeOpen(true)}>
                  주소 검색
                </Button>
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">상세 주소</Form.Label>
              <Form.Control 
                type="text" 
                value={wpAddressDetails} 
                onChange={e => setWpAddressDetails(e.target.value)} 
                placeholder="예: 2층 노란돼지 식당" 
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>취소</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" /> : (editMode ? '수정' : '추가')}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* 주소 검색 모달 */}
      <Modal show={isPostcodeOpen} onHide={() => setIsPostcodeOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">주소 검색</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <DaumPostcode onComplete={handleCompletePostcode} autoClose style={{ height: '400px' }} />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AdminWorkPlaces;
