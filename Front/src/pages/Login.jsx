import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { authLogin, fetchMyInfo } from '../api/authApi';
import { Form, Button, Container, Card, Alert, Spinner } from 'react-bootstrap';
import './Auth.css';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const response = await authLogin(userId, password);
      if (response.success) {
        const token = response.data.accessToken;
        const infoRes = await fetchMyInfo(token);

        let userInfo = {};
        if (infoRes.success && infoRes.data) {
          userInfo = {
            userId: infoRes.data.userId,
            name: infoRes.data.userName,
            email: infoRes.data.userEmail,
            phone: infoRes.data.userPhone,
            branch: infoRes.data.workPlaceName,
            userType: infoRes.data.userTypeName,
            isAdmin: infoRes.data.is_admin
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
    <div className="auth-container">
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <div className="w-100" style={{ maxWidth: "400px" }}>
          <Card className="glass-card shadow-lg border-0 rounded-4">
            <Card.Body className="p-5">
              <h2 className="text-center mb-4 fw-bold auth-title">로그인</h2>
              {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}
              <Form onSubmit={handleLogin}>
                <Form.Group id="userId" className="mb-3">
                  <Form.Label className="fw-semibold">아이디</Form.Label>
                  <Form.Control
                    type="text"
                    value={userId}
                    onChange={handleUserIdChange}
                    required
                    placeholder="아이디를 입력하세요 (영문, 숫자)"
                    className={`custom-input ${userIdError ? 'is-invalid' : ''}`}
                  />
                  {userIdError && (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.82rem' }}>
                      ⚠️ {userIdError}
                    </div>
                  )}
                </Form.Group>
                <Form.Group id="password" className="mb-4">
                  <Form.Label className="fw-semibold">비밀번호</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="비밀번호를 입력하세요"
                    className="custom-input"
                  />
                </Form.Group>
                <Button disabled={loading || !!userIdError} className="w-100 mb-3 custom-btn" type="submit" size="lg">
                  {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : "로그인"}
                </Button>
              </Form>
              <div className="w-100 text-center mt-3 text-muted">
                계정이 없으신가요? <Link to="/signup" className="text-decoration-none fw-bold auth-link">회원가입</Link>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default Login;
