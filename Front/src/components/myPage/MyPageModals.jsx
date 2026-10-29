import React from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { RiLockPasswordLine } from 'react-icons/ri';

const MyPageModals = ({
  // Password modal
  showPwModal,
  onClosePwModal,
  currentPw,
  setCurrentPw,
  newPw,
  setNewPw,
  newPwConfirm,
  setNewPwConfirm,
  pwError,
  pwSuccess,
  pwSaving,
  onChangePassword,

  // Withdraw modal
  showWithdrawModal,
  onCloseWithdrawModal,
  withdrawError,
  withdrawSaving,
  onWithdraw
}) => {
  return (
    <>
      {/* 비밀번호 변경 모달 */}
      <Modal show={showPwModal} onHide={onClosePwModal} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold text-dark fs-5">
            <RiLockPasswordLine className="me-1 text-primary" /> 비밀번호 변경
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {pwError && <Alert variant="danger" className="rounded-3 py-2 text-center">{pwError}</Alert>}
          {pwSuccess && <Alert variant="success" className="rounded-3 py-2 text-center">{pwSuccess}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">현재 비밀번호</Form.Label>
            <Form.Control
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              placeholder="현재 비밀번호 입력"
              className="custom-input"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">새 비밀번호</Form.Label>
            <Form.Control
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="새 비밀번호 입력"
              className="custom-input"
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold text-muted small">새 비밀번호 확인</Form.Label>
            <Form.Control
              type="password"
              value={newPwConfirm}
              onChange={e => setNewPwConfirm(e.target.value)}
              placeholder="새 비밀번호 재입력"
              className="custom-input"
            />
          </Form.Group>
          <Button
            variant="primary"
            onClick={onChangePassword}
            disabled={pwSaving}
            className="w-100 py-2 fw-bold rounded-3"
          >
            {pwSaving ? <Spinner as="span" animation="border" size="sm" /> : "비밀번호 변경하기"}
          </Button>
        </Modal.Body>
      </Modal>

      {/* 회원 탈퇴 모달 */}
      <Modal show={showWithdrawModal} onHide={onCloseWithdrawModal} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold text-danger fs-5">
            회원 탈퇴
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {withdrawError && <Alert variant="danger" className="rounded-3 py-2 text-center">{withdrawError}</Alert>}
          <p className="fw-bold text-dark mb-2">정말로 해당 서비스를 탈퇴하시겠습니까?</p>
          <ul className="text-muted small ps-3 mb-4">
            <li>탈퇴 시 계정은 즉시 비활성화되어 로그인할 수 없습니다.</li>
            <li>관련 법령(국세기본법, 근로기준법 등)에 따라 급여 정산 및 근태 기록은 최대 5년 동안 보관 후 파기됩니다.</li>
            <li>이 작업은 되돌릴 수 없습니다.</li>
          </ul>

          <div className="d-flex gap-2">
            <Button
              variant="secondary"
              onClick={onCloseWithdrawModal}
              className="flex-grow-1 py-2 fw-bold rounded-3"
            >
              취소
            </Button>
            <Button
              variant="danger"
              onClick={onWithdraw}
              disabled={withdrawSaving}
              className="flex-grow-1 py-2 fw-bold rounded-3"
            >
              {withdrawSaving ? <Spinner as="span" animation="border" size="sm" /> : "탈퇴하기"}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default MyPageModals;

