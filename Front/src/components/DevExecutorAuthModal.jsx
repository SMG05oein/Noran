import React, { useState } from 'react';
import { Modal, Form, Alert, Button, Spinner } from 'react-bootstrap';

/**
 * 2차 인증(id/pw = db.executor.*) 공통 모달
 */
const DevExecutorAuthModal = ({
  show,
  onHide,
  title = 'Secondary Authentication',
  warning = '위험한 작업입니다. Executor ID/PW를 입력하세요.',
  confirmLabel = '인증 및 실행',
  loading = false,
  onConfirm,
}) => {
  const [authId, setAuthId] = useState('');
  const [authPw, setAuthPw] = useState('');

  const handleClose = () => {
    setAuthId('');
    setAuthPw('');
    onHide?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authId || !authPw) return;
    await onConfirm?.(authId, authPw);
    setAuthId('');
    setAuthPw('');
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton style={{ backgroundColor: '#2b2b40', color: '#fff', borderBottom: '1px solid #3f3f5a' }}>
        <Modal.Title className="fw-bold text-danger">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#1e1e2d', color: '#fff' }}>
        {warning && <Alert variant="warning" className="py-2 mb-4">{warning}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Executor ID</Form.Label>
            <Form.Control
              type="text"
              value={authId}
              onChange={(e) => setAuthId(e.target.value)}
              required
              autoComplete="username"
              style={{ backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a' }}
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>Executor PW</Form.Label>
            <Form.Control
              type="password"
              value={authPw}
              onChange={(e) => setAuthPw(e.target.value)}
              required
              autoComplete="current-password"
              style={{ backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a' }}
            />
          </Form.Group>
          <div className="d-flex justify-content-end">
            <Button variant="secondary" className="me-2" onClick={handleClose} disabled={loading}>
              취소
            </Button>
            <Button variant="danger" type="submit" disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : confirmLabel}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default DevExecutorAuthModal;
