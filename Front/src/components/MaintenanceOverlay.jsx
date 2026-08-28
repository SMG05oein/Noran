import React, { useState } from 'react';
import { Container, Button, Badge, Spinner, Form, Alert } from 'react-bootstrap';
import { devLogin } from '../api/devAuthApi';
import useDevAuthStore from '../store/useDevAuthStore';

const MaintenanceOverlay = ({ onRecheck, checking }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [devId, setDevId] = useState('');
  const [devPw, setDevPw] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const loginStore = useDevAuthStore((state) => state.devLogin);

  const handleDevLogin = async (e) => {
    e.preventDefault();
    if (!devId.trim() || !devPw.trim()) return setLoginError('아이디와 비밀번호를 입력해주세요.');

    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await devLogin(devId, devPw);
      if (response.success) {
        loginStore({ 
          devId: response.data.devId, 
          devName: response.data.devName, 
          isTempPw: response.data.isTempPw,
          tokens: { accessToken: response.data.accessToken } 
        });
        // 현재 점검 세션에 대한 우회 플래그 설정
        sessionStorage.setItem('maintenance_bypassed', 'true');
        // 로그인 성공 시 상태 재확인을 호출하여 isMaintenance를 false로 만듦
        onRecheck();
      } else {
        setLoginError(response.error || '개발자 로그인에 실패했습니다.');
      }
    } catch (err) {
      setLoginError('서버 오류가 발생했습니다.');
    } finally {
      setLoginLoading(false);
    }
  };
  return (
    <div
      data-bs-theme="dark"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#181825',
        color: '#fff',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      <Container style={{ maxWidth: '520px' }}>
        <div
          className="shadow-lg border-0 rounded-4 text-center overflow-hidden"
          style={{ backgroundColor: '#2b2b40', color: '#fff', borderTop: '6px solid #ff4d4f' }}
        >
          <div className="p-4 p-md-5">
            {showLogin ? (
              <div className="text-start">
                <h4 className="fw-bold mb-4 text-center" style={{ color: '#00d2ff' }}>관리자 접근</h4>
                {loginError && <Alert variant="danger" className="py-2">{loginError}</Alert>}
                <Form onSubmit={handleDevLogin}>
                  <Form.Group className="mb-3">
                    <Form.Label className="small text-white">Developer ID</Form.Label>
                    <Form.Control
                      type="text"
                      value={devId}
                      onChange={(e) => setDevId(e.target.value)}
                      required
                      style={{ backgroundColor: '#1e1e2d', color: '#fff', border: '1px solid #3f3f5a' }}
                    />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label className="small text-white">Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={devPw}
                      onChange={(e) => setDevPw(e.target.value)}
                      required
                      style={{ backgroundColor: '#1e1e2d', color: '#fff', border: '1px solid #3f3f5a' }}
                    />
                  </Form.Group>
                  <Button disabled={loginLoading} type="submit" className="w-100 fw-bold mb-3" style={{ backgroundColor: '#00d2ff', border: 'none', color: '#000' }}>
                    {loginLoading ? <Spinner size="sm" animation="border" /> : '로그인'}
                  </Button>
                  <div className="text-center">
                    <span className="text-muted small" style={{ cursor: 'pointer' }} onClick={() => setShowLogin(false)}>
                      뒤로 가기
                    </span>
                  </div>
                </Form>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                    style={{ width: '80px', height: '80px', backgroundColor: '#3d1a24', color: '#ff4d4f' }}
                  >
                    <i className="bi bi-tools fs-1"></i>
                  </div>
                  <div>
                    <Badge bg="danger" className="px-3 py-2 fs-6 rounded-pill mb-2">
                      🚨 시스템 긴급 점검 진행 중
                    </Badge>
                  </div>
                </div>

                <h3 className="fw-bold mb-3" style={{ color: '#fff' }}>
                  서비스 이용 일시 중단 안내
                </h3>

                <p className="text-secondary leading-relaxed mb-4" style={{ fontSize: '0.95rem' }}>
                  현재 시스템 성능 향상 및 신규 기능 반영을 위한 긴급 점검 작업이 진행되고 있습니다.<br />
                  점검이 완료되는 대로 더욱 안정적인 서비스로 돌아오겠습니다.
                </p>

                <div
                  className="p-3 rounded-3 mb-4 text-start small"
                  style={{ backgroundColor: '#1e1e2d', border: '1px solid #3f3f5a' }}
                >
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-white">점검 대상:</span>
                    <span className="fw-semibold text-info">근무관리 전 기능</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-white">상태:</span>
                    <span className="fw-semibold text-danger">접근 제한 중</span>
                  </div>
                </div>

                <Button
                  variant="outline-info"
                  size="lg"
                  className="w-100 fw-bold rounded-pill shadow-sm"
                  onClick={onRecheck}
                  disabled={checking}
                >
                  {checking ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      점검 상태 확인 중...
                    </>
                  ) : (
                    '🔄 점검 상태 재확인 (새로고침)'
                  )}
                </Button>
                
                <div className="mt-4">
                  <span 
                    className="text-muted small text-decoration-underline" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowLogin(true)}
                  >
                    관리자 접근
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default MaintenanceOverlay;
