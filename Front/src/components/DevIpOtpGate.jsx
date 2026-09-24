import { useEffect, useState, useCallback } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { requestDevIpOtp, verifyDevIpOtp } from '../api/devAuthApi';
import {
  subscribeDevIpOtpRequired,
  completeDevIpOtp,
  cancelDevIpOtp,
  getDevIpToken,
} from '../api/devIpToken';

const DevIpOtpGate = () => {
  const [show, setShow] = useState(false);
  const [code, setCode] = useState('');
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleRequest = useCallback(async () => {
    setSending(true);
    setError('');
    const res = await requestDevIpOtp();
    if (res.success) {
      setInfo(res.data);
      setCooldown(Math.max(60, Number(res.data?.expiresInSeconds) ? 60 : 60));
    } else {
      setError(res.error);
      if (res.status === 429) setCooldown(60);
    }
    setSending(false);
  }, []);

  const openModal = useCallback(() => {
    setShow(true);
    setError('');
    setCode('');
    handleRequest();
  }, [handleRequest]);

  useEffect(() => subscribeDevIpOtpRequired(openModal), [openModal]);

  const handleClose = () => {
    setShow(false);
    cancelDevIpOtp('cancelled');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('인증번호를 입력하세요.');
      return;
    }
    setVerifying(true);
    setError('');
    const res = await verifyDevIpOtp(code.trim());
    if (res.success) {
      completeDevIpOtp(res.data?.ipToken || getDevIpToken());
      setShow(false);
      setCode('');
      setInfo(null);
    } else {
      setError(res.error);
    }
    setVerifying(false);
  };

  return (
    <Modal show={show} onHide={handleClose} centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton style={{ backgroundColor: '#2b2b40', color: '#fff', borderBottom: '1px solid #3f3f5a' }}>
        <Modal.Title className="fw-bold" style={{ color: '#00d2ff' }}>IP 이메일 인증</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#1e1e2d', color: '#fff' }}>
        <p className="small text-secondary mb-3">
          허용되지 않은 IP에서 개발자 API에 접근합니다. 등록된 메일로 인증번호를 받아 확인하세요.
        </p>
        {info?.toMasked && (
          <Alert variant="info" className="py-2 small">
            {info.message || `인증번호를 ${info.toMasked} 로 발송했습니다.`}
            {info.expiresInSeconds != null && ` (${info.expiresInSeconds}초 유효)`}
          </Alert>
        )}
        {error && <Alert variant="danger" className="py-2">{error}</Alert>}

        <div className="d-flex gap-2 mb-3">
          <Button
            variant="outline-info"
            className="fw-bold"
            onClick={handleRequest}
            disabled={sending || cooldown > 0}
          >
            {sending ? (
              <Spinner animation="border" size="sm" />
            ) : cooldown > 0 ? (
              `재요청 ${cooldown}s`
            ) : (
              '인증번호 받기'
            )}
          </Button>
        </div>

        <Form onSubmit={handleVerify}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">인증번호</Form.Label>
            <Form.Control
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6자리 코드"
              style={{ backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a' }}
            />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={verifying}>
              취소
            </Button>
            <Button variant="info" type="submit" className="fw-bold" disabled={verifying}>
              {verifying ? <Spinner animation="border" size="sm" /> : '확인'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default DevIpOtpGate;
