import React from 'react';
import { Modal, Form, Alert, Spinner, Button } from 'react-bootstrap';

const DevMainModals = ({
  // Password modal props
  showPwModal,
  setShowPwModal,
  oldPw,
  setOldPw,
  newPw,
  setNewPw,
  pwError,
  pwLoading,
  onPasswordChange,

  // Exec modal props
  showExecModal,
  setShowExecModal,
  execAction,
  execId,
  setExecId,
  execPw,
  setExecPw,
  execError,
  testServerBusy,
  onExecConfirm,
}) => {
  return (
    <>
      {/* 비밀번호 변경 모달 */}
      <Modal show={showPwModal} onHide={() => setShowPwModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">비밀번호 변경</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pwError && <Alert variant="danger">{pwError}</Alert>}
          <Form onSubmit={onPasswordChange}>
            <Form.Group className="mb-3">
              <Form.Label>기존 비밀번호</Form.Label>
              <Form.Control
                type="password"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>새 비밀번호</Form.Label>
              <Form.Control
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowPwModal(false)}>
                취소
              </Button>
              <Button variant="success" type="submit" disabled={pwLoading}>
                {pwLoading ? <Spinner animation="border" size="sm" /> : '변경'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* 테스트 서버 제어 실행 모달 */}
      <Modal
        show={showExecModal}
        onHide={() => !testServerBusy && setShowExecModal(false)}
        centered
      >
        <Modal.Header closeButton={!testServerBusy}>
          <Modal.Title className="fw-bold">
            {execAction === 'start' ? '테스트 서버 실행'
              : execAction === 'stop' ? '테스트 서버 끄기'
                : execAction === 'restart' ? '테스트 서버 재실행'
                  : '테스트 서버 JAR 재기동'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {execError && <Alert variant="danger">{execError}</Alert>}
          <p className="text-muted small mb-3">운영 보호용 executor ID / PW를 입력하세요.</p>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              onExecConfirm();
            }}
          >
            <Form.Group className="mb-3">
              <Form.Label>Executor ID</Form.Label>
              <Form.Control
                value={execId}
                onChange={(e) => setExecId(e.target.value)}
                autoComplete="username"
                required
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Executor PW</Form.Label>
              <Form.Control
                type="password"
                value={execPw}
                onChange={(e) => setExecPw(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                disabled={testServerBusy}
                onClick={() => setShowExecModal(false)}
              >
                취소
              </Button>
              <Button variant="success" type="submit" disabled={testServerBusy}>
                {testServerBusy ? <Spinner animation="border" size="sm" /> : '확인'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default DevMainModals;

