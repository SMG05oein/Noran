import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useDevAuthStore from '../store/useDevAuthStore';
import { fetchSystemInfo, changeDevPassword, fetchAlertConfig, sendAlertTest } from '../api/devAuthApi';
import { Modal, Form, Alert, Spinner, Button } from 'react-bootstrap';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import DevLogViewer from '../components/DevLogViewer';
import ApiAnalyticsViewer from '../components/ApiAnalyticsViewer';
import AnnouncementManager from '../components/AnnouncementManager';
import './DevConsole.css';

const NAV = [
  { key: 'overview', label: '현황' },
  { key: 'logs', label: '로그' },
  { key: 'analytics', label: 'API 통계' },
  { key: 'announcements', label: '공지·점검' },
];

const formatUptime = (seconds = 0) => {
  const s = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}시간 ${m}분 ${sec}초`;
};

/** recent_errors.requestPage 만 표시 (없으면 알 수 없음). 스킴 없으면 https:// 보정 */
const formatRequestPage = (err) => {
  const page = (err?.requestPage || '').trim();
  if (!page) return '알 수 없음';
  if (/^https?:\/\//i.test(page)) return page;
  // BE 표시용 `dwaeji.jp/dev/dashboard` → `https://dwaeji.jp/dev/dashboard`
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#]|$)/i.test(page)) {
    return `https://${page}`;
  }
  return page;
};

const StatusPill = ({ ok, label, unknown, tone }) => {
  if (unknown) return <span className="dc-pill dc-pill-muted">{label || '없음'}</span>;
  const resolved = tone || (ok ? 'ok' : 'bad');
  const cls = resolved === 'ok' ? 'dc-pill-ok' : resolved === 'warn' ? 'dc-pill-warn' : 'dc-pill-bad';
  return <span className={`dc-pill ${cls}`}>{label || (resolved === 'ok' ? '정상' : resolved === 'warn' ? '주의' : '이상')}</span>;
};

const DevMain = () => {
  const devUser = useDevAuthStore((state) => state.devUser);
  const logout = useDevAuthStore((state) => state.devLogout);
  const navigate = useNavigate();

  const [section, setSection] = useState('overview');
  const [sysInfo, setSysInfo] = useState(null);
  const [alertConfig, setAlertConfig] = useState(null);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertTesting, setAlertTesting] = useState(false);
  const [logJump, setLogJump] = useState({ level: '', keyword: '' });
  const [loading, setLoading] = useState(true);

  const [showPwModal, setShowPwModal] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const res = await fetchSystemInfo();
      if (!alive) return;
      if (res.success) setSysInfo(res.data);
      setLoading(false);
    };
    const loadAlerts = async () => {
      const res = await fetchAlertConfig();
      if (alive && res.success) setAlertConfig(res.data);
    };
    tick();
    loadAlerts();
    const interval = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const refreshAlertConfig = async () => {
    const res = await fetchAlertConfig();
    if (res.success) setAlertConfig(res.data);
  };

  const handleAlertTest = async () => {
    setAlertTesting(true);
    setAlertMsg('');
    const res = await sendAlertTest();
    if (res.success) {
      const when = res.data?.sentAt
        ? new Date(res.data.sentAt).toLocaleString('ko-KR')
        : '';
      setAlertMsg(
        `${res.data?.message || '테스트 알림을 발송했습니다.'}${when ? ` (${when})` : ''}`
      );
      await refreshAlertConfig();
    } else {
      setAlertMsg(res.error || '발송에 실패했습니다.');
    }
    setAlertTesting(false);
  };

  const openLogsForError = (err) => {
    setLogJump({
      level: 'ERROR',
      keyword: err?.apiPath && err.apiPath !== 'Unknown' ? String(err.apiPath) : '',
    });
    setSection('logs');
  };

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
      alert('비밀번호가 변경되었습니다. 다시 로그인하세요.');
      handleLogout();
    } else {
      setPwError(res.error);
    }
    setPwLoading(false);
  };

  const health = sysInfo?.health;
  const version = sysInfo?.version;
  const host = sysInfo?.host;
  const status = sysInfo?.status;
  const dbOk = String(health?.db?.status || '').toUpperCase() === 'UP';
  const memUsedPct = sysInfo?.memory?.max_mb
    ? Math.round((sysInfo.memory.used_mb / sysInfo.memory.max_mb) * 100)
    : (sysInfo?.memory?.total_mb
      ? Math.round((sysInfo.memory.used_mb / sysInfo.memory.total_mb) * 100)
      : null);
  const diskFree = health?.disk?.freePercent;
  const memWarn = status?.memoryWarnThreshold ?? 85;
  const diskWarn = status?.diskWarnThreshold ?? 15;
  const dbLatency = health?.db?.latencyMs;
  const dbTone = !health?.db ? '' : (!dbOk ? 'crit' : (dbLatency != null && dbLatency >= 200 ? 'warn' : ''));
  const diskTone = diskFree == null ? '' : (diskFree <= diskWarn / 2 ? 'crit' : diskFree <= diskWarn ? 'warn' : '');
  const memTone = memUsedPct == null ? '' : (memUsedPct >= 95 ? 'crit' : memUsedPct >= memWarn ? 'warn' : '');
  const overall = status?.overall || 'ok';
  const fetchedLabel = sysInfo?.fetchedAt
    ? new Date(sysInfo.fetchedAt).toLocaleTimeString('ko-KR')
    : null;

  const trafficData = useMemo(() => {
    if (!sysInfo?.traffic) return [];
    return [
      { name: '2xx', value: sysInfo.traffic.success, fill: '#3fb950' },
      { name: '3xx', value: sysInfo.traffic.redirection, fill: '#58a6ff' },
      { name: '404', value: sysInfo.traffic.notFound, fill: '#d29922' },
      { name: '4xx', value: sysInfo.traffic.clientError, fill: '#f85149' },
      { name: '5xx', value: sysInfo.traffic.serverError, fill: '#da3633' },
      { name: '429', value: sysInfo.traffic.rateLimited, fill: '#8b949e' },
    ];
  }, [sysInfo]);

  const memData = useMemo(() => {
    if (!sysInfo?.memory) return [];
    return [
      { name: '사용', value: sysInfo.memory.used_mb },
      { name: '여유', value: sysInfo.memory.free_mb },
    ];
  }, [sysInfo]);

  const tooltipStyle = {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#e6edf3',
    fontSize: 12,
  };

  return (
    <div className="dev-console" data-bs-theme="dark">
      <div className="dc-shell">
        <header className="dc-topbar">
          <div className="dc-brand">
            <span className="dc-brand-kicker">OCI · 단일 서버</span>
            <h1 className="dc-brand-title">운영 콘솔</h1>
            <p className="dc-brand-sub">배포·재기동은 서버 SSH에서 직접 · 콘솔은 모니터링·공지용</p>
          </div>
          <div className="dc-top-actions">
            <span className="dc-user">
              <strong>{devUser?.devName || devUser?.devId}</strong>
              {devUser?.isTempPw === 1 && (
                <span className="dc-pill dc-pill-warn ms-2">임시 비밀번호</span>
              )}
            </span>
            <button type="button" className="dc-btn dc-btn-ghost" onClick={() => setShowPwModal(true)}>
              비밀번호
            </button>
            <button type="button" className="dc-btn" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </header>

        <nav className="dc-nav" aria-label="콘솔 메뉴">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`dc-nav-btn${section === item.key ? ' active' : ''}`}
              onClick={() => setSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {sysInfo && (
          <div className="dc-sticky-strip" aria-label="상태 요약">
            <StatusPill
              tone={overall === 'ok' ? 'ok' : overall === 'warn' ? 'warn' : 'bad'}
              label={status?.label || '상태'}
              unknown={!status && !sysInfo.health}
            />
            <span className="dc-sticky-item">
              DB <strong>{health?.db?.status || '—'}</strong>
              {dbLatency != null && <span style={{ color: 'var(--dc-muted)' }}>({dbLatency}ms)</span>}
            </span>
            <span className="dc-sticky-item">
              디스크 <strong style={{ color: diskTone === 'crit' || diskTone === 'warn' ? 'var(--dc-warn)' : undefined }}>
                {diskFree != null ? `${diskFree}%` : '—'}
              </strong>
            </span>
            <span className="dc-sticky-item">
              메모리 <strong style={{ color: memTone === 'crit' || memTone === 'warn' ? 'var(--dc-warn)' : undefined }}>
                {memUsedPct != null ? `${memUsedPct}%` : '—'}
              </strong>
            </span>
            <span className="dc-sticky-item" style={{ color: 'var(--dc-muted)', marginLeft: 'auto' }}>
              {fetchedLabel ? `갱신 ${fetchedLabel}` : ''}
              {host?.serverPort ? ` · :${host.serverPort}` : ''}
            </span>
          </div>
        )}

        {loading ? (
          <div className="dc-center"><div className="dc-spinner" /></div>
        ) : !sysInfo ? (
          <div className="dc-center">시스템 정보를 불러오지 못했습니다.</div>
        ) : section === 'overview' ? (
          <>
            <div className={`dc-banner ${overall}`}>
              <div className="dc-banner-left">
                <StatusPill
                  tone={overall === 'ok' ? 'ok' : overall === 'warn' ? 'warn' : 'bad'}
                  label={status?.label || (overall === 'ok' ? '정상' : overall === 'warn' ? '주의' : '위험')}
                  unknown={!status}
                />
                <span className="dc-banner-title">전체 상태</span>
                {Array.isArray(status?.issues) && status.issues.length > 0 && (
                  <span className="dc-banner-issues">{status.issues.join(' · ')}</span>
                )}
              </div>
              <span className="dc-banner-meta">
                {fetchedLabel ? `갱신 ${fetchedLabel}` : '갱신 중'} · 5초마다
              </span>
            </div>

            <div className="dc-status-row">
              <div className={`dc-stat ${dbTone}`.trim()}>
                <div className="dc-stat-label">데이터베이스</div>
                <div className="dc-stat-value">
                  <StatusPill ok={dbOk} label={health?.db?.status || '알 수 없음'} unknown={!health?.db} />
                </div>
                <div className="dc-stat-meta">
                  {dbLatency != null ? `지연 ${dbLatency} ms` : '지연 정보 없음'}
                </div>
              </div>
              <div className={`dc-stat ${diskTone}`.trim()}>
                <div className="dc-stat-label">디스크 여유</div>
                <div className="dc-stat-value">
                  {diskFree != null ? `${diskFree}%` : '—'}
                </div>
                <div className="dc-stat-meta">
                  {health?.disk
                    ? `${health.disk.freeGb ?? '-'} / ${health.disk.totalGb ?? '-'} GB · 임계 ${diskWarn}%`
                    : '정보 없음'}
                </div>
              </div>
              <div className={`dc-stat ${memTone}`.trim()}>
                <div className="dc-stat-label">JVM 메모리</div>
                <div className="dc-stat-value">
                  {memUsedPct != null ? `${memUsedPct}%` : '—'}
                </div>
                <div className="dc-stat-meta">
                  {sysInfo.memory
                    ? `${sysInfo.memory.used_mb} / ${sysInfo.memory.max_mb ?? sysInfo.memory.total_mb} MB · 임계 ${memWarn}%`
                    : '정보 없음'}
                </div>
              </div>
              <div className="dc-stat">
                <div className="dc-stat-label">가동 시간</div>
                <div className="dc-stat-value" style={{ fontSize: '1.05rem' }}>
                  {formatUptime(sysInfo.uptime?.uptime_seconds)}
                </div>
                <div className="dc-stat-meta">
                  부하 {health?.cpu?.systemLoadAverage ?? '—'}
                  {health?.cpu?.processCpuLoad != null
                    && ` · 프로세스 ${Math.round(health.cpu.processCpuLoad * 100)}%`}
                </div>
              </div>
            </div>

            <div className="dc-grid-2">
              <div className="dc-panel">
                <div className="dc-panel-head">
                  <h2 className="dc-panel-title">호스트 / 런타임</h2>
                </div>
                <div className="dc-panel-body">
                  <dl className="dc-kv">
                    <dt>호스트</dt>
                    <dd className="dc-mono">{host?.hostname || '—'}</dd>
                    <dt>포트</dt>
                    <dd className="dc-mono">
                      {host?.serverPort ?? '—'}
                      {Array.isArray(host?.blueGreenPorts)
                        ? ` · blue/green ${host.blueGreenPorts.join('/')}`
                        : ''}
                    </dd>
                    <dt>PID</dt>
                    <dd className="dc-mono">{host?.pid ?? '—'}</dd>
                    <dt>모드</dt>
                    <dd>{host?.mode === 'oci-single' ? 'OCI 단일 서버' : (host?.mode || '—')} · {host?.deployMethod || 'deploy.sh'}</dd>
                    <dt>디스크 경로</dt>
                    <dd className="dc-mono">{host?.diskPath || health?.disk?.path || '—'}</dd>
                    <dt>작업 경로</dt>
                    <dd className="dc-mono">{host?.workingDirectory || '—'}</dd>
                    <dt>OS</dt>
                    <dd>{sysInfo.os?.name} · {sysInfo.os?.arch}</dd>
                    <dt>코어</dt>
                    <dd>{sysInfo.os?.processors ?? '—'}</dd>
                    <dt>풀</dt>
                    <dd className="dc-mono">
                      활성 {health?.pool?.active ?? '-'} / 대기 {health?.pool?.idle ?? '-'} / 최대 {health?.pool?.max ?? '-'}
                      {health?.pool?.waiting != null ? ` · 대기열 ${health.pool.waiting}` : ''}
                    </dd>
                    <dt>앱</dt>
                    <dd>{version?.appName || '—'}</dd>
                    <dt>프로필</dt>
                    <dd className="dc-mono">
                      {Array.isArray(version?.profiles)
                        ? version.profiles.join(', ') || '(default)'
                        : '—'}
                    </dd>
                    <dt>Git</dt>
                    <dd className="dc-mono">{version?.gitSha || 'unknown'}</dd>
                    <dt>빌드</dt>
                    <dd className="dc-mono">{version?.buildTime || '—'}</dd>
                    <dt>Java</dt>
                    <dd className="dc-mono">{version?.javaVersion || '—'}</dd>
                    <dt>기동</dt>
                    <dd className="dc-mono">
                      {version?.startTime
                        ? new Date(version.startTime).toLocaleString('ko-KR')
                        : '—'}
                    </dd>
                  </dl>
                </div>
              </div>

              <div className="dc-panel">
                <div className="dc-panel-head">
                  <h2 className="dc-panel-title">JVM 힙</h2>
                </div>
                <div className="dc-panel-body">
                  {memData.length > 0 ? (
                    <div className="dc-chart" style={{ height: 180 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={memData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={72}
                            paddingAngle={2}
                          >
                            <Cell fill="#f85149" />
                            <Cell fill="#3fb950" />
                          </Pie>
                          <RechartsTooltip contentStyle={tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="dc-empty">메모리 데이터 없음</div>
                  )}
                  <div className="dc-stat-meta text-center">
                    최대 {sysInfo.memory?.max_mb ?? '—'} MB
                  </div>
                </div>
              </div>
            </div>

            <div className="dc-grid-2">
              <div className="dc-panel">
                <div className="dc-panel-head">
                  <h2 className="dc-panel-title">트래픽 (Redis 누적)</h2>
                  <span className="dc-mono" style={{ color: 'var(--dc-muted)', fontSize: '0.75rem' }}>
                    합계 {sysInfo.traffic?.total ?? 0} · 배포 후에도 유지
                  </span>
                </div>
                <div className="dc-panel-body">
                  <div className="dc-chart">
                    <ResponsiveContainer>
                      <BarChart data={trafficData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8b949e' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#8b949e' }} />
                        <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={tooltipStyle} />
                        <Bar dataKey="value" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="dc-panel">
                <div className="dc-panel-head">
                  <h2 className="dc-panel-title">알림 (이메일)</h2>
                  <StatusPill
                    ok={!!alertConfig?.enabled}
                    label={alertConfig?.enabled ? '활성' : '비활성'}
                    unknown={alertConfig == null}
                  />
                </div>
                <div className="dc-panel-body">
                  <dl className="dc-kv">
                    <dt>채널</dt>
                    <dd>
                      {alertConfig?.emailEnabled ? '이메일' : '없음'}
                      {alertConfig?.webhookEnabled ? ' + Webhook' : ''}
                    </dd>
                    <dt>수신</dt>
                    <dd className="dc-mono">{alertConfig?.toMasked || '—'}</dd>
                    <dt>마지막 발송</dt>
                    <dd className="dc-mono">
                      {alertConfig?.lastSentAt
                        ? new Date(alertConfig.lastSentAt).toLocaleString('ko-KR')
                        : '아직 없음'}
                    </dd>
                    <dt>메모리</dt>
                    <dd className="dc-mono">≥ {alertConfig?.memoryUsedPercentThreshold ?? '—'}%</dd>
                    <dt>디스크</dt>
                    <dd className="dc-mono">여유 ≤ {alertConfig?.diskFreePercentThreshold ?? '—'}%</dd>
                    <dt>5xx 증가</dt>
                    <dd className="dc-mono">≥ {alertConfig?.serverErrorDeltaThreshold ?? '—'}건</dd>
                  </dl>
                  {alertMsg && (
                    <div
                      className={`dc-alert ${alertMsg.includes('실패') ? 'dc-alert-bad' : 'dc-alert-ok'}`}
                      style={{ marginTop: '0.75rem', marginBottom: 0 }}
                    >
                      {alertMsg}
                    </div>
                  )}
                  <div className="dc-ops-bar">
                    <button
                      type="button"
                      className="dc-btn dc-btn-accent"
                      disabled={!alertConfig?.enabled || alertTesting}
                      onClick={handleAlertTest}
                    >
                      {alertTesting ? '발송 중…' : '테스트 알림'}
                    </button>
                    <span className="dc-ops-hint">
                      IP OTP와 같은 메일 설정을 사용합니다. 수신 전용은 ALERT_EMAIL_TO로 지정할 수 있습니다.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dc-panel">
              <div className="dc-panel-head">
                <h2 className="dc-panel-title">최근 오류</h2>
                <span className="dc-mono" style={{ color: 'var(--dc-muted)', fontSize: '0.72rem' }}>
                  최대 100건 · 행 클릭 → 로그 탭
                </span>
              </div>
              <div className="dc-panel-body tight">
                <div className="dc-table-wrap">
                  {sysInfo.recent_errors?.length > 0 ? (
                    <table className="dc-table">
                      <thead>
                        <tr>
                          <th>번호</th>
                          <th>시각</th>
                          <th>IP</th>
                          <th>요청자</th>
                          <th>코드</th>
                          <th>경로</th>
                          <th>요청 페이지</th>
                          <th>메시지</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sysInfo.recent_errors.map((err) => (
                          <tr
                            key={`${err.no}-${err.timestamp}`}
                            className="dc-clickable"
                            onClick={() => openLogsForError(err)}
                            title="로그에서 이 경로 검색"
                          >
                            <td>{err.no}</td>
                            <td className="dc-mono" style={{ color: 'var(--dc-muted)' }}>{err.timestamp}</td>
                            <td className="dc-mono">{err.clientIp}</td>
                            <td>{err.who}</td>
                            <td style={{ color: 'var(--dc-warn)' }}>{err.httpCode}</td>
                            <td className="dc-mono" style={{ color: 'var(--dc-info)' }}>{err.apiPath}</td>
                            <td className="dc-mono" style={{ color: 'var(--dc-muted)', maxWidth: 220 }}>
                              {formatRequestPage(err)}
                            </td>
                            <td style={{ color: 'var(--dc-danger)' }}>{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="dc-empty">오류 로그가 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : section === 'logs' ? (
          <DevLogViewer initialLevel={logJump.level} initialKeyword={logJump.keyword} />
        ) : section === 'analytics' ? (
          <ApiAnalyticsViewer />
        ) : (
          <AnnouncementManager />
        )}
      </div>

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
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowPwModal(false)}>취소</Button>
              <Button variant="success" type="submit" disabled={pwLoading}>
                {pwLoading ? <Spinner animation="border" size="sm" /> : '변경'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default DevMain;
