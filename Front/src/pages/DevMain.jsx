import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useDevAuthStore from '../store/useDevAuthStore';
import { fetchSystemInfo, changeDevPassword } from '../api/devAuthApi';
import { Container, Row, Col, Card, Button, Spinner, Modal, Form, Alert, Badge, Tabs, Tab, Table } from 'react-bootstrap';
import DatabaseManager from '../components/DatabaseManager';

const DevMain = () => {
  const devUser = useDevAuthStore((state) => state.devUser);
  const logout = useDevAuthStore((state) => state.devLogout);
  const navigate = useNavigate();

  const [sysInfo, setSysInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password Change State
  const [showPwModal, setShowPwModal] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    const getSysInfo = async () => {
      const res = await fetchSystemInfo();
      if (res.success) {
        setSysInfo(res.data);
      }
      setLoading(false);
    };
    getSysInfo();
    // 5초마다 트래픽 자동 갱신
    const interval = setInterval(getSysInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/dev/login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!oldPw || !newPw) return setPwError('모든 필드를 입력하세요.');
    setPwLoading(true);
    setPwError('');

    const res = await changeDevPassword(oldPw, newPw);
    if (res.success) {
      alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인 해주세요.');
      handleLogout();
    } else {
      setPwError(res.error);
    }
    setPwLoading(false);
  };

  return (
    <div style={{ backgroundColor: '#1e1e2d', minHeight: '100vh', color: '#fff', padding: '2rem 0' }}>
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-5 border-bottom border-secondary pb-3">
          <h2 className="fw-bold" style={{ color: '#00d2ff' }}>Developer Dashboard</h2>
          <div>
            <span className="me-3 fw-semibold">Welcome, {devUser?.devName}</span>
            {devUser?.isTempPw === 1 && <Badge bg="danger" className="me-3">임시 비밀번호 사용중</Badge>}
            <Button variant="outline-info" className="me-2" onClick={() => setShowPwModal(true)}>비밀번호 변경</Button>
            <Button variant="outline-light" onClick={handleLogout}>Logout</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="info" />
          </div>
        ) : sysInfo ? (
          <>
          <Tabs defaultActiveKey="system" className="mb-4" data-bs-theme="dark">
            <Tab eventKey="system" title="System & Traffic">
              <Row className="g-4">
                <Col md={4}>
                  <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                    <Card.Body>
                      <Card.Title style={{ color: '#00d2ff' }} className="fw-bold mb-4">JVM Memory</Card.Title>
                      <p className="mb-2"><strong>Total:</strong> {sysInfo.memory.total_mb} MB</p>
                      <p className="mb-2"><strong>Used:</strong> {sysInfo.memory.used_mb} MB</p>
                      <p className="mb-2"><strong>Free:</strong> {sysInfo.memory.free_mb} MB</p>
                      <p className="mb-0"><strong>Max:</strong> {sysInfo.memory.max_mb} MB</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                    <Card.Body>
                      <Card.Title style={{ color: '#00d2ff' }} className="fw-bold mb-4">System OS</Card.Title>
                      <p className="mb-2"><strong>OS Name:</strong> {sysInfo.os.name}</p>
                      <p className="mb-2"><strong>Architecture:</strong> {sysInfo.os.arch}</p>
                      <p className="mb-2"><strong>Version:</strong> {sysInfo.os.version}</p>
                      <p className="mb-0"><strong>Processors:</strong> {sysInfo.os.processors}</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                    <Card.Body>
                      <Card.Title style={{ color: '#00d2ff' }} className="fw-bold mb-4">Server Uptime</Card.Title>
                      <p className="mb-2 fs-3 text-center mt-4">
                        {Math.floor(sysInfo.uptime.uptime_seconds / 3600)}h{' '}
                        {Math.floor((sysInfo.uptime.uptime_seconds % 3600) / 60)}m{' '}
                        {sysInfo.uptime.uptime_seconds % 60}s
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row className="mt-4 g-4">
                {/* 트래픽 모니터링 */}
                <Col md={4}>
                  <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                    <Card.Body>
                      <Card.Title style={{ color: '#00d2ff' }} className="fw-bold mb-4">Traffic Insights</Card.Title>
                      <div className="d-flex justify-content-between mb-2">
                        <span><Badge bg="success">성공 (2xx)</Badge></span>
                        <span className="fw-bold">{sysInfo.traffic.success}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span><Badge bg="primary">리다이렉션 (3xx)</Badge></span>
                        <span className="fw-bold">{sysInfo.traffic.redirection}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span><Badge bg="warning" text="dark">찾지 못했습니다 (404)</Badge></span>
                        <span className="fw-bold">{sysInfo.traffic.notFound}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span><Badge bg="danger">클라이언트 오류 (4xx)</Badge></span>
                        <span className="fw-bold">{sysInfo.traffic.clientError}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span><Badge bg="danger">서버 오류 (5xx)</Badge></span>
                        <span className="fw-bold">{sysInfo.traffic.serverError}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-3 border-bottom border-secondary pb-2">
                        <span><Badge bg="secondary">레이트 리미티드 (429)</Badge></span>
                        <span className="fw-bold">{sysInfo.traffic.rateLimited}</span>
                      </div>
                      <div className="d-flex justify-content-between fs-5 text-info">
                        <span className="fw-bold">총 요청 수</span>
                        <span className="fw-bold">{sysInfo.traffic.total}</span>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                
                {/* 최근 오류 로그 */}
                <Col md={8}>
                  <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#1e1e2d', border: '1px solid #3f3f5a' }}>
                    <Card.Header style={{ backgroundColor: '#2b2b40', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }} className="fw-bold">
                      최근 오류 로그 (Max 50)
                    </Card.Header>
                    <Card.Body style={{ overflowY: 'auto', maxHeight: '350px', padding: 0 }}>
                      {sysInfo.recent_errors?.length > 0 ? (
                        <Table responsive variant="dark" hover size="sm" className="mb-0" style={{ fontSize: '0.85rem' }}>
                          <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#1e1e2d' }}>
                            <tr>
                              <th>No</th>
                              <th>누가</th>
                              <th>Code</th>
                              <th>API Path</th>
                              <th>Msg</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sysInfo.recent_errors.map((err, idx) => (
                              <tr key={idx}>
                                <td>{err.no}</td>
                                <td><Badge bg={err.who === '로그인 전' ? 'secondary' : 'info'}>{err.who}</Badge></td>
                                <td><span className="text-warning">{err.httpCode}</span></td>
                                <td><span className="text-info">{err.apiPath}</span></td>
                                <td><span className="text-danger text-break">{err.message}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      ) : (
                        <div className="text-center text-secondary py-4">오류 로그가 없습니다.</div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab>

            <Tab eventKey="database" title="Database Management">
              <DatabaseManager />
            </Tab>
          </Tabs>
        </>
        ) : (
          <div className="text-center py-5 text-danger">시스템 정보를 불러오지 못했습니다.</div>
        )}
      </Container>

      {/* 비밀번호 변경 모달 */}
      <Modal show={showPwModal} onHide={() => setShowPwModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#2b2b40', color: '#fff', borderBottom: '1px solid #3f3f5a' }}>
          <Modal.Title className="fw-bold">비밀번호 변경</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#1e1e2d', color: '#fff' }}>
          {pwError && <Alert variant="danger">{pwError}</Alert>}
          <Form onSubmit={handlePasswordChange}>
            <Form.Group className="mb-3">
              <Form.Label>기존 비밀번호</Form.Label>
              <Form.Control
                type="password"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                required
                style={{ backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a' }}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>새 비밀번호</Form.Label>
              <Form.Control
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                style={{ backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a' }}
              />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowPwModal(false)}>취소</Button>
              <Button variant="info" type="submit" disabled={pwLoading}>
                {pwLoading ? <Spinner animation="border" size="sm" /> : '변경하기'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default DevMain;
