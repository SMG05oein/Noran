import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { authLogin, fetchMyInfo } from '../api/authApi';
import { Form, Button, Container, Card, Alert, Spinner } from 'react-bootstrap';
import { RiUser3Line, RiLockPasswordLine, RiRestaurantLine } from 'react-icons/ri';
import { mapConsentFlags } from '../utils/consentFlags';
import './Auth.css';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoLogin, setAutoLogin] = useState(true);

  // 실시간 유효성 상태 (아이디 정규식 필터링 제거)
  const [userIdError, setUserIdError] = useState('');

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleUserIdChange = (e) => {
    const val = e.target.value;
    setUserId(val);
    if (val && !/^[A-Za-z0-9]+$/.test(val)) {
      setUserIdError('영문자와 숫자만 입력할 수 있습니다.');
    } else {
      setUserIdError('');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (userIdError) return;
    if (!userId.trim()) return setError('아이디를 입력해주세요.');
    if (!password.trim()) return setError('비밀번호를 입력해주세요.');

    setLoading(true);
    setError('');

    try {
      localStorage.setItem('isAutoLogin', autoLogin ? 'true' : 'false');
      
      const response = await authLogin(userId, password, autoLogin);
      if (response.success) {
        const token = response.data.accessToken;
        const infoRes = await fetchMyInfo(token);

        let userInfo = {};
        if (infoRes.success && infoRes.data) {
          userInfo = {
            userIdx: infoRes.data.userIdx,
            userId: infoRes.data.userId,
            name: infoRes.data.userName,
            email: infoRes.data.userEmail,
            phone: infoRes.data.userPhone,
            branch: infoRes.data.workPlaceName,
            workPlaceIdx: infoRes.data.workPlaceIdx,
            userType: infoRes.data.userTypeName,
            userHourlyWage: infoRes.data.userHourlyWage,
            isAdmin: infoRes.data.is_admin ?? infoRes.data.isAdmin,
            fkUtIdx: infoRes.data.fkUtIdx,
            ...mapConsentFlags(infoRes.data),
            needsPrivacyConsent: undefined,
            needsCollectionConsent: undefined,
            needsTermsConsent: undefined,
          };
        }

        login({ ...userInfo, tokens: response.data });

        if (userInfo.isAdmin === 1) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        setError(response.error || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container login-container">
      <Container className="d-flex align-items-center justify-content-center p-0 p-sm-2">
        <div className="w-100" style={{ maxWidth: "380px" }}>
          <Card className="auth-card border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="auth-header">
                <div className="auth-brand-logo shadow-sm">
                  <RiRestaurantLine />
                </div>
                <h1 className="auth-title">로그인</h1>
              </div>

              {error && <Alert variant="danger" className="rounded-3 py-2 text-center">{error}</Alert>}

              <Form onSubmit={handleLogin}>
                <Form.Group id="userId" className="mb-3">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    <RiUser3Line /> 아이디
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={userId}
                    onChange={handleUserIdChange}
                    required
                    placeholder="아이디를 입력하세요"
                    className={`custom-input ${userIdError ? 'is-invalid' : ''}`}
                    autoComplete="username"
                  />
                  {userIdError && (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.82rem' }}>
                      ⚠️ {userIdError}
                    </div>
                  )}
                </Form.Group>

                <Form.Group id="password" className="mb-4">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    <RiLockPasswordLine /> 비밀번호
                  </Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="비밀번호를 입력하세요"
                    className="custom-input"
                    autoComplete="current-password"
                  />
                </Form.Group>

                <Form.Group className="mb-4 d-flex align-items-center">
                  <Form.Check
                    type="checkbox"
                    id="autoLogin"
                    label={<span className="text-muted small fw-bold ms-1" style={{ cursor: 'pointer' }}>자동 로그인</span>}
                    checked={autoLogin}
                    onChange={(e) => setAutoLogin(e.target.checked)}
                  />
                </Form.Group>

                <Button
                  disabled={loading}
                  className="w-100 mb-3 custom-btn d-flex align-items-center justify-content-center"
                  type="submit"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" className="me-2" role="status" aria-hidden="true" />
                      로그인 중...
                    </>
                  ) : "로그인"}
                </Button>
              </Form>

              <div className="auth-footer">
                계정이 없으신가요? <Link to="/signup" className="auth-link ms-1">회원가입</Link>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default Login;
