import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Table, Badge, Modal, Alert, Spinner, Row, Col } from 'react-bootstrap';
import {
  fetchAnnouncements,
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
  toggleMaintenanceMode
} from '../api/devAuthApi';

const AnnouncementManager = () => {
  const [data, setData] = useState({ maintenanceMode: false, notices: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await fetchAnnouncements();
    if (res.success && res.data) {
      setData({
        maintenanceMode: res.data.maintenanceMode || false,
        notices: res.data.notices || []
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMaintenanceToggle = async () => {
    const nextState = !data.maintenanceMode;
    const confirmMsg = nextState
      ? '서비스를 점검 모드로 전환하시겠습니까? 사용자들의 접근이 제한될 수 있습니다.'
      : '점검 모드를 해제하고 정상 서비스를 재개하시겠습니까?';
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    const res = await toggleMaintenanceMode(nextState);
    if (res.success) {
      setData((prev) => ({ ...prev, maintenanceMode: res.data.maintenanceMode }));
    } else {
      alert(res.error || '점검 모드 변경 실패');
    }
    setActionLoading(false);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg('제목과 내용을 모두 입력해 주세요.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    const res = await createAnnouncement(title, content, isActive, startDate, endDate);
    if (res.success) {
      setShowAddModal(false);
      setTitle('');
      setContent('');
      setStartDate('');
      setEndDate('');
      setIsActive(true);
      loadData();
    } else {
      setErrorMsg(res.error);
    }
    setActionLoading(false);
  };

  const handleToggleNotice = async (id) => {
    const res = await toggleAnnouncement(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || '상태 변경 실패');
    }
  };

  const handleDeleteNotice = async (id) => {
    if (!window.confirm('정말 이 공지사항을 삭제하시겠습니까?')) return;
    const res = await deleteAnnouncement(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || '삭제 실패');
    }
  };

  return (
    <Row className="g-4">
      {/* 점검 모드 제어 카어 */}
      <Col md={12}>
        <Card
          className="shadow-sm border-0 rounded-4"
          style={{
            backgroundColor: data.maintenanceMode ? '#3d1a24' : '#2b2b40',
            color: '#fff',
            borderLeft: data.maintenanceMode ? '5px solid #ff4d4f' : '5px solid #52c41a'
          }}
        >
          <Card.Body className="d-flex justify-content-between align-items-center py-4 px-4">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <h5 className="fw-bold mb-0">서비스 긴급 점검 모드 (Maintenance Mode)</h5>
                {data.maintenanceMode ? (
                  <Badge bg="danger" className="px-3 py-2 fs-6">🔴 점검 모드 가동 중</Badge>
                ) : (
                  <Badge bg="success" className="px-3 py-2 fs-6">🟢 정상 서비스 작동 중</Badge>
                )}
              </div>
              <p className="text-secondary mb-0 small">
                {data.maintenanceMode
                  ? '현재 일반 사용자 앱/웹 접속 시 점검 안내 페이지가 노출됩니다.'
                  : '점검 모드를 켜면 앱의 일반 기능이 차단되고 점검 배너가 표시됩니다.'}
              </p>
            </div>
            <Button
              variant={data.maintenanceMode ? 'success' : 'danger'}
              size="lg"
              className="fw-bold px-4 rounded-pill shadow-sm"
              onClick={handleMaintenanceToggle}
              disabled={actionLoading || loading}
            >
              {actionLoading ? <Spinner animation="border" size="sm" /> : data.maintenanceMode ? '점검 모드 해제' : '점검 모드 실행'}
            </Button>
          </Card.Body>
        </Card>
      </Col>

      {/* 공지사항 목록 카드 */}
      <Col md={12}>
        <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
          <Card.Header className="d-flex justify-content-between align-items-center py-3" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
            <span className="fw-bold fs-5">공지사항 관리</span>
            <Button variant="info" className="fw-bold" onClick={() => setShowAddModal(true)}>
              + 새 공지사항 등록
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="info" />
              </div>
            ) : data.notices && data.notices.length > 0 ? (
              <div className="table-responsive hide-scrollbar">
                <Table responsive variant="dark" hover className="mb-0 align-middle" style={{ fontSize: '0.9rem' }}>
                  <thead style={{ backgroundColor: '#1e1e2d' }}>
                    <tr className="text-muted">
                      <th style={{ width: '70px' }} className="text-center">ID</th>
                      <th style={{ width: '220px' }}>제목</th>
                      <th>내용</th>
                      <th style={{ width: '150px' }}>게시 기간</th>
                      <th style={{ width: '100px' }} className="text-center">상태</th>
                      <th style={{ width: '120px' }}>작성일시</th>
                      <th style={{ width: '150px' }} className="text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.notices.map((notice) => (
                      <tr key={notice.id}>
                        <td className="text-center fw-bold text-secondary">{notice.id}</td>
                        <td className="fw-bold text-info">{notice.title}</td>
                        <td className="text-light text-truncate" style={{ maxWidth: '300px' }}>
                          {notice.content}
                        </td>
                        <td className="text-muted small">
                          {notice.startDate || notice.endDate ? (
                            <>
                              {notice.startDate ? notice.startDate.substring(0, 10).replace(/-/g, '.') : ''}
                              {' ~ '}
                              {notice.endDate ? notice.endDate.substring(0, 10).replace(/-/g, '.') : ''}
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="text-center">
                          {notice.isActive ? (
                            <Badge bg="success">노출 중</Badge>
                          ) : (
                            <Badge bg="secondary">비노출</Badge>
                          )}
                        </td>
                        <td className="text-muted small">
                          {notice.createdAt ? new Date(notice.createdAt).toLocaleString('ko-KR') : '-'}
                        </td>
                        <td className="text-center">
                          <Button
                            variant={notice.isActive ? 'warning' : 'outline-success'}
                            size="sm"
                            className="me-2 py-0 px-2"
                            onClick={() => handleToggleNotice(notice.id)}
                          >
                            {notice.isActive ? '숨기기' : '노출하기'}
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="py-0 px-2"
                            onClick={() => handleDeleteNotice(notice.id)}
                          >
                            삭제
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-muted py-5">등록된 공지사항이 없습니다.</div>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* 새 공지사항 등록 모달 */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#2b2b40', color: '#fff', borderBottom: '1px solid #3f3f5a' }}>
          <Modal.Title className="fw-bold text-info">새 공지사항 등록</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#1e1e2d', color: '#fff' }}>
          {errorMsg && <Alert variant="danger" className="py-2">{errorMsg}</Alert>}
          <Form onSubmit={handleCreateSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">공지 제목</Form.Label>
              <Form.Control
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 정기 서버 점검 안내"
                required
                style={{ backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a' }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">공지 내용</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="공지할 세부 내용을 입력하세요."
                required
                style={{ backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a' }}
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">게시 시작일 (선택)</Form.Label>
                  <Form.Control
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a', colorScheme: 'dark' }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">게시 종료일 (선택)</Form.Label>
                  <Form.Control
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a', colorScheme: 'dark' }}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-4">
              <Form.Check
                type="checkbox"
                id="notice-active-checkbox"
                label="즉시 노출 (활성화)"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="fw-semibold text-info"
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>취소</Button>
              <Button variant="info" type="submit" disabled={actionLoading}>
                {actionLoading ? <Spinner animation="border" size="sm" /> : '등록하기'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Row>
  );
};

export default AnnouncementManager;
