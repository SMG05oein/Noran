import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useDevAuthStore from '../store/useDevAuthStore';
import {
  fetchSystemInfo,
  fetchDeployInfo,
  fetchDashboardAudit,
  fetchAlertConfig,
  postDashboardAction,
  sendAlertTest,
  changeDevPassword,
} from '../api/devAuthApi';
import {
  Container, Row, Col, Card, Button, Spinner, Modal, Form, Alert, Badge, Tabs, Tab, Table,
} from 'react-bootstrap';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';
import DevLogViewer from '../components/DevLogViewer';
import ApiAnalyticsViewer from '../components/ApiAnalyticsViewer';
import AnnouncementManager from '../components/AnnouncementManager';
import NetlifyDeployManager from '../components/NetlifyDeployManager';
import DevExecutorAuthModal from '../components/DevExecutorAuthModal';


const statusBadge = (status) => {
  const up = String(status).toUpperCase() === 'UP';
  return <Badge bg={up ? 'success' : 'danger'}>{status || '-'}</Badge>;
};

const DevMain = () => {
  const devUser = useDevAuthStore((state) => state.devUser);
  const logout = useDevAuthStore((state) => state.devLogout);
  const navigate = useNavigate();

  const [sysInfo, setSysInfo] = useState(null);
  const [deployInfo, setDeployInfo] = useState(null);
  const [alertConfig, setAlertConfig] = useState(null);
  const [auditRows, setAuditRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPwModal, setShowPwModal] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [authAction, setAuthAction] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const loadSidePanels = useCallback(async () => {
    const [deployRes, alertRes, auditRes] = await Promise.all([
      fetchDeployInfo(),
      fetchAlertConfig(),
      fetchDashboardAudit(50),
    ]);
    if (deployRes.success) setDeployInfo(deployRes.data);
    if (alertRes.success) setAlertConfig(alertRes.data);
    if (auditRes.success) setAuditRows(Array.isArray(auditRes.data) ? auditRes.data : []);
  }, []);

  useEffect(() => {
    const getSysInfo = async () => {
      const res = await fetchSystemInfo();
      if (res.success) setSysInfo(res.data);
      setLoading(false);
    };
    getSysInfo();
    loadSidePanels();
    const interval = setInterval(getSysInfo, 5000);
    return () => clearInterval(interval);
  }, [loadSidePanels]);

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

  const openAuth = (action) => {
    setActionMsg('');
    setAuthAction(action);
  };

  const handleAuthConfirm = async (id, pw) => {
    setAuthLoading(true);
    setActionMsg('');
    let res;
    if (authAction === 'alert-test') {
      res = await sendAlertTest(id, pw);
    } else {
      res = await postDashboardAction(authAction, id, pw);
    }
    if (res.success) {
      setActionMsg(res.data?.message || '요청이 수락되었습니다.');
      setAuthAction(null);
      loadSidePanels();
      if (authAction === 'shutdown') {
        alert(res.data?.message || '서버가 곧 종료됩니다.');
      }
    } else {
      setActionMsg(res.error);
    }
    setAuthLoading(false);
  };

  const health = sysInfo?.health;
  const version = sysInfo?.version || deployInfo;

  return (
    <div className="dev-container min-vh-100" data-bs-theme="dark" style={{ padding: '2rem 0', backgroundColor: 'var(--color-bg-cream)' }}>
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-5 border-bottom border-secondary pb-3">
          <h2 className="fw-bold" style={{ color: '#00d2ff' }}>개발자 대시보드</h2>
          <div>
            <span className="me-3 fw-semibold">환영합니다, {devUser?.devName} 님</span>
            {devUser?.isTempPw === 1 && <Badge bg="danger" className="me-3">임시 비밀번호 사용 중</Badge>}
            <Button variant="outline-info" className="me-2" onClick={() => setShowPwModal(true)}>비밀번호 변경</Button>
            <Button variant="outline-light" onClick={handleLogout}>로그아웃</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="info" />
          </div>
        ) : sysInfo ? (
          <>
            <Tabs defaultActiveKey="system" className="mb-4" data-bs-theme="dark">
              <Tab eventKey="system" title="시스템 및 트래픽">
                {actionMsg && (
                  <Alert variant={actionMsg.includes('실패') || actionMsg.includes('오류') ? 'danger' : 'info'} className="py-2">
                    {actionMsg}
                  </Alert>
                )}

                <Row className="g-4">
                  <Col md={4}>
                    <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                      <Card.Body>
                        <Card.Title style={{ color: '#00d2ff' }} className="fw-bold mb-4">JVM 메모리 현황</Card.Title>
                        {sysInfo.memory && (
                          <div style={{ height: 180, width: '100%' }}>
                            <ResponsiveContainer>
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: '사용 중', value: sysInfo.memory.used_mb },
                                    { name: '여유', value: sysInfo.memory.free_mb }
                                  ]}
                                  cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}
                                  dataKey="value"
                                >
                                  <Cell key="cell-0" fill="#ff4d4d" />
                                  <Cell key="cell-1" fill="#00d2ff" />
                                </Pie>
                                <RechartsTooltip contentStyle={{ backgroundColor: '#1e1e2d', border: '1px solid #3f3f5a', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                                <Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: '12px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        <div className="d-flex justify-content-between small text-secondary mt-3 px-2">
                          <span>총 메모리: {sysInfo.memory?.total_mb} MB</span>
                          <span>최대 할당: {sysInfo.memory?.max_mb} MB</span>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                      <Card.Body>
                        <Card.Title style={{ color: '#00d2ff' }} className="fw-bold mb-4">시스템 OS 정보</Card.Title>
                        <p className="mb-2"><strong>OS 이름:</strong> {sysInfo.os?.name}</p>
                        <p className="mb-2"><strong>아키텍처:</strong> {sysInfo.os?.arch}</p>
                        <p className="mb-2"><strong>버전:</strong> {sysInfo.os?.version}</p>
                        <p className="mb-0"><strong>프로세서 수:</strong> {sysInfo.os?.processors} 코어</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="shadow-sm border-0 h-100 rounded-4">
                      <Card.Body>
                        <Card.Title className="fw-bold mb-4 text-primary">서버 가동 시간 (Uptime)</Card.Title>
                        <p className="mb-2 fs-3 text-center mt-4 text-info fw-bold">
                          {Math.floor((sysInfo.uptime?.uptime_seconds || 0) / 3600)}시간{' '}
                          {Math.floor(((sysInfo.uptime?.uptime_seconds || 0) % 3600) / 60)}분{' '}
                          {(sysInfo.uptime?.uptime_seconds || 0) % 60}초
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Health + Version */}
                <Row className="mt-4 g-4">
                  <Col md={6}>
                    <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                      <Card.Header className="fw-bold" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
                        헬스체크
                      </Card.Header>
                      <Card.Body>
                        {health ? (
                          <>
                            <p className="mb-2 d-flex justify-content-between">
                              <span>DB</span>
                              <span>
                                {statusBadge(health.db?.status)}
                                {health.db?.latencyMs != null && (
                                  <span className="text-secondary ms-2 small">{health.db.latencyMs} ms</span>
                                )}
                              </span>
                            </p>
                            <p className="mb-2 small text-secondary">
                              Disk: {health.disk?.freeGb ?? '-'} / {health.disk?.totalGb ?? '-'} GB
                              ({health.disk?.freePercent ?? '-'}% free)
                            </p>
                            <p className="mb-2 small text-secondary">
                              CPU load: {health.cpu?.systemLoadAverage ?? '-'}
                              {health.cpu?.processCpuLoad != null && ` · process ${Math.round(health.cpu.processCpuLoad * 100)}%`}
                            </p>
                            <p className="mb-0 small text-secondary">
                              Pool: active {health.pool?.active ?? '-'} / idle {health.pool?.idle ?? '-'} / max {health.pool?.max ?? '-'}
                              {health.pool?.waiting != null && ` · waiting ${health.pool.waiting}`}
                            </p>
                          </>
                        ) : (
                          <div className="text-secondary">헬스 데이터 없음</div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                      <Card.Header className="fw-bold" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
                        버전 / 배포
                      </Card.Header>
                      <Card.Body>
                        <p className="mb-2"><strong>App:</strong> {version?.appName || '-'}</p>
                        <p className="mb-2">
                          <strong>Profile:</strong>{' '}
                          {Array.isArray(version?.profiles) ? version.profiles.join(', ') || '(default)' : '-'}
                        </p>
                        <p className="mb-2"><strong>Git SHA:</strong> <code>{version?.gitSha || 'unknown'}</code></p>
                        <p className="mb-2"><strong>Build:</strong> {version?.buildTime || '-'}</p>
                        <p className="mb-2"><strong>Java:</strong> {version?.javaVersion || '-'}</p>
                        <p className="mb-3"><strong>Started:</strong> {version?.startTime ? new Date(version.startTime).toLocaleString('ko-KR') : '-'}</p>
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => openAuth('shutdown')}
                          >
                            종료
                          </Button>
                          <Button
                            variant="outline-info"
                            size="sm"
                            disabled={!deployInfo?.redeployConfigured}
                            onClick={() => openAuth('redeploy')}
                            title={deployInfo?.redeployConfigured ? '' : 'BACKEND_DEPLOY_WEBHOOK_URL 미설정'}
                          >
                            백엔드 재배포
                          </Button>
                          {deployInfo?.statusUrl && (
                            <Button
                              variant="link"
                              size="sm"
                              href={deployInfo.statusUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-info"
                            >
                              배포 상태 링크
                            </Button>
                          )}
                          <span className="small text-secondary">
                            재기동은 JAR 배포(deploy.sh)로만 합니다.
                          </span>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>



                {/* Alerts */}
                <Row className="mt-4 g-4">
                  <Col md={12}>
                    <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                      <Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div>
                          <h6 className="fw-bold mb-1" style={{ color: '#00d2ff' }}>알림 (Webhook)</h6>
                          <div className="small text-secondary">
                            {alertConfig?.enabled ? (
                              <Badge bg="success" className="me-2">활성</Badge>
                            ) : (
                              <Badge bg="secondary" className="me-2">비활성</Badge>
                            )}
                            mem ≥ {alertConfig?.memoryUsedPercentThreshold ?? '-'}% · disk free ≤ {alertConfig?.diskFreePercentThreshold ?? '-'}% · 5xx Δ ≥ {alertConfig?.serverErrorDeltaThreshold ?? '-'}
                          </div>
                        </div>
                        <Button
                          variant="outline-info"
                          size="sm"
                          disabled={!alertConfig?.enabled}
                          onClick={() => openAuth('alert-test')}
                        >
                          테스트 알림
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Row className="mt-4 g-4">
                  <Col md={4}>
                    <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                      <Card.Body>
                        <Card.Title className="fw-bold mb-4" style={{ color: '#00d2ff' }}>트래픽 응답 현황</Card.Title>
                        {sysInfo.traffic && (
                          <div style={{ height: 230, width: '100%' }}>
                            <ResponsiveContainer>
                              <BarChart
                                data={[
                                  { name: '2xx', value: sysInfo.traffic.success, fill: '#198754' },
                                  { name: '3xx', value: sysInfo.traffic.redirection, fill: '#0d6efd' },
                                  { name: '404', value: sysInfo.traffic.notFound, fill: '#ffc107' },
                                  { name: '4xx', value: sysInfo.traffic.clientError, fill: '#dc3545' },
                                  { name: '5xx', value: sysInfo.traffic.serverError, fill: '#a71d2a' },
                                  { name: '429', value: sysInfo.traffic.rateLimited, fill: '#6c757d' },
                                ]}
                                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#adb5bd' }} />
                                <YAxis tick={{ fontSize: 12, fill: '#adb5bd' }} />
                                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e1e2d', border: '1px solid #3f3f5a', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        <div className="d-flex justify-content-between fs-6 mt-3 border-top pt-3" style={{ borderColor: '#3f3f5a', color: '#00d2ff' }}>
                          <span className="fw-bold">총 요청 수</span>
                          <span className="fw-bold">{sysInfo.traffic?.total}건</span>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={8}>
                    <Card className="shadow-sm border-0 h-100 rounded-4">
                      <Card.Header className="fw-bold text-primary">
                        최근 발생 오류 로그 (최대 50건)
                      </Card.Header>
                      <Card.Body style={{ overflow: 'auto', maxHeight: '350px', padding: 0 }}>
                        {sysInfo.recent_errors?.length > 0 ? (
                          <Table striped hover size="sm" className="mb-0 text-center align-middle" style={{ fontSize: '0.85rem' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#2b2b40' }}>
                              <tr style={{ whiteSpace: 'nowrap' }}>
                                <th>번호</th>
                                <th>발생 시각</th>
                                <th>요청 출처(IP)</th>
                                <th>요청 페이지(Referer)</th>
                                <th>요청자</th>
                                <th>코드</th>
                                <th>API 경로</th>
                                <th>메시지</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sysInfo.recent_errors.map((err, idx) => (
                                <tr key={idx} style={{ whiteSpace: 'nowrap' }}>
                                  <td>{err.no}</td>
                                  <td style={{ color: '#adb5bd' }}>{err.timestamp}</td>
                                  <td style={{ color: '#a8c7fa' }}>{err.clientIp}</td>
                                  <td style={{ color: '#e2b3ff' }}>{err.referer || '-'}</td>
                                  <td><Badge bg={err.who === '로그인 전' ? 'secondary' : 'info'}>{err.who}</Badge></td>
                                  <td><span className="text-warning">{err.httpCode}</span></td>
                                  <td><span className="text-primary">{err.apiPath}</span></td>
                                  <td><span className="text-danger">{err.message}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        ) : (
                          <div className="text-center text-secondary py-4">발생한 오류 로그가 없습니다.</div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Row className="mt-4 g-4">
                  <Col md={12}>
                    <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                      <Card.Header
                        className="fw-bold d-flex justify-content-between align-items-center"
                        style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}
                      >
                        <span>프로세스 감사 로그</span>
                        <Button variant="outline-info" size="sm" onClick={loadSidePanels}>새로고침</Button>
                      </Card.Header>
                      <Card.Body className="p-0" style={{ maxHeight: '220px', overflow: 'auto' }}>
                        {auditRows.length > 0 ? (
                          <Table size="sm" variant="dark" hover className="mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr className="text-muted">
                                <th>시각</th>
                                <th>Actor</th>
                                <th>동작</th>
                                <th>결과</th>
                                <th>메시지</th>
                                <th>IP</th>
                              </tr>
                            </thead>
                            <tbody>
                              {auditRows.map((row) => (
                                <tr key={row.id}>
                                  <td className="text-secondary">{row.timestamp ? new Date(row.timestamp).toLocaleString('ko-KR') : '-'}</td>
                                  <td>{row.actor || '-'}</td>
                                  <td>{row.detail || '-'}</td>
                                  <td>{row.success ? <Badge bg="success">OK</Badge> : <Badge bg="danger">FAIL</Badge>}</td>
                                  <td className="text-truncate" style={{ maxWidth: 200 }}>{row.message}</td>
                                  <td>{row.clientIp || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        ) : (
                          <div className="text-center text-secondary py-4">감사 기록이 없습니다.</div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>

              <Tab eventKey="logs" title="실시간 로그">
                <DevLogViewer />
              </Tab>

              <Tab eventKey="analytics" title="API 호출 통계">
                <ApiAnalyticsViewer />
              </Tab>

              <Tab eventKey="announcements" title="공지사항 및 점검 관리">
                <AnnouncementManager />
              </Tab>

              <Tab eventKey="netlify" title="프론트 배포">
                <NetlifyDeployManager />
              </Tab>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-5 text-danger">시스템 정보를 불러오지 못했습니다.</div>
        )}
      </Container>

      <Modal show={showPwModal} onHide={() => setShowPwModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">비밀번호 변경</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pwError && <Alert variant="danger">{pwError}</Alert>}
          <Form onSubmit={handlePasswordChange}>
            <Form.Group className="mb-3">
              <Form.Label>기존 비밀번호</Form.Label>
              <Form.Control type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>새 비밀번호</Form.Label>
              <Form.Control type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowPwModal(false)}>취소</Button>
              <Button variant="primary" type="submit" disabled={pwLoading}>
                {pwLoading ? <Spinner animation="border" size="sm" /> : '변경하기'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <DevExecutorAuthModal
        show={!!authAction}
        onHide={() => setAuthAction(null)}
        title={
          authAction === 'shutdown' ? '서버 종료'
            : authAction === 'redeploy' ? '백엔드 재배포'
              : authAction === 'alert-test' ? '테스트 알림'
                : '인증'
        }
        warning={
          authAction === 'shutdown'
            ? '서버 프로세스가 종료됩니다. 자동 재기동되지 않습니다. Executor ID/PW를 입력하세요.'
            : 'Executor ID/PW를 입력하세요.'
        }
        loading={authLoading}
        onConfirm={handleAuthConfirm}
      />
    </div>
  );
};

export default DevMain;
