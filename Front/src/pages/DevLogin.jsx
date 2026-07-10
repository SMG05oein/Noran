import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useDevAuthStore from '../store/useDevAuthStore';
import { devLogin } from '../api/devAuthApi';
import { Form, Button, Container, Card, Alert, Spinner } from 'react-bootstrap';

const DevLogin = () => {
  const [devId, setDevId] = useState('');
  const [devPw, setDevPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useDevAuthStore((state) => state.devLogin);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!devId.trim() || !devPw.trim()) return setError('아이디와 비밀번호를 입력해주세요.');

    setLoading(true);
    setError('');

    try {
      const response = await devLogin(devId, devPw);
      if (response.success) {
        login({ 
          devId: response.data.devId, 
          devName: response.data.devName, 
          isTempPw: response.data.isTempPw,
          tokens: { accessToken: response.data.accessToken } 
        });
        navigate('/dev/dashboard');
      } else {
        setError(response.error || '개발자 로그인에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#1e1e2d', minHeight: '100vh', color: '#fff' }}>
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <div className="w-100" style={{ maxWidth: "400px" }}>
          <Card className="shadow-lg border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
            <Card.Body className="p-5">
              <h2 className="text-center mb-4 fw-bold" style={{ color: '#00d2ff' }}>Developer Portal</h2>
              {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}
              <Form onSubmit={handleLogin}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Developer ID</Form.Label>
                  <Form.Control
                    type="text"
                    value={devId}
                    onChange={(e) => setDevId(e.target.value)}
                    required
                    style={{ backgroundColor: '#1e1e2d', color: '#fff', border: '1px solid #3f3f5a' }}
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={devPw}
                    onChange={(e) => setDevPw(e.target.value)}
                    required
                    style={{ backgroundColor: '#1e1e2d', color: '#fff', border: '1px solid #3f3f5a' }}
                  />
                </Form.Group>
                <Button disabled={loading} className="w-100 mb-3" style={{ backgroundColor: '#00d2ff', border: 'none', color: '#000', fontWeight: 'bold' }} type="submit" size="lg">
                  {loading ? <Spinner as="span" animation="border" size="sm" /> : "Access"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default DevLogin;
