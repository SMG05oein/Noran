import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useDevAuthStore from '../store/useDevAuthStore';
import {
  fetchSystemInfo,
  changeDevPassword,
  fetchAlertConfig,
  sendAlertTest,
  fetchTestServerStatus,
  startTestServer,
  stopTestServer,
  restartTestServer,
  deployTestServer,
} from '../api/devAuthApi';
import DevLogViewer from '../components/DevLogViewer';
import ApiAnalyticsViewer from '../components/ApiAnalyticsViewer';
import AnnouncementManager from '../components/AnnouncementManager';
import DevIpManager from '../components/DevIpManager';
import { NAV, StatusPill } from '../components/devMain/devMainUtils';
import DevOverviewTab from '../components/devMain/DevOverviewTab';
import DevMainModals from '../components/devMain/DevMainModals';
import './DevConsole.css';

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

  const [testServer, setTestServer] = useState(null);
  const [testServerMsg, setTestServerMsg] = useState('');
  const [testServerBusy, setTestServerBusy] = useState(false);
  const [showExecModal, setShowExecModal] = useState(false);
  const [execAction, setExecAction] = useState(null); // start | stop | restart | deploy
  const [execId, setExecId] = useState('');
  const [execPw, setExecPw] = useState('');
  const [execError, setExecError] = useState('');

  const refreshTestServer = async () => {
    const res = await fetchTestServerStatus();
    if (res.success) setTestServer(res.data);
    else setTestServerMsg(res.error || '상태 조회 실패');
  };

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
    const loadTest = async () => {
      const res = await fetchTestServerStatus();
      if (alive && res.success) setTestServer(res.data);
    };
    tick();
    loadAlerts();
    loadTest();
    const interval = setInterval(() => {
      tick();
      loadTest();
    }, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const openExecModal = (action) => {
    setExecAction(action);
    setExecId('');
    setExecPw('');
    setExecError('');
    setShowExecModal(true);
  };

  const handleExecConfirm = async () => {
    if (!execAction) return;
    setTestServerBusy(true);
    setExecError('');
    setTestServerMsg('');
    const runner =
      execAction === 'start' ? startTestServer
        : execAction === 'stop' ? stopTestServer
          : execAction === 'restart' ? restartTestServer
            : deployTestServer;
    const res = await runner(execId, execPw);
    if (res.success) {
      setTestServer(res.data);
      setTestServerMsg(
        execAction === 'start' ? '테스트 서버를 실행했습니다.'
          : execAction === 'stop' ? '테스트 서버를 중지했습니다.'
            : execAction === 'restart' ? '테스트 서버를 재실행했습니다.'
              : '테스트 서버 JAR를 재기동했습니다.'
      );
      setShowExecModal(false);
    } else {
      setExecError(res.error || '요청에 실패했습니다.');
    }
    setTestServerBusy(false);
    await refreshTestServer();
  };

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
          <DevOverviewTab
            sysInfo={sysInfo}
            status={status}
            health={health}
            version={version}
            host={host}
            overall={overall}
            fetchedLabel={fetchedLabel}
            dbOk={dbOk}
            dbLatency={dbLatency}
            dbTone={dbTone}
            diskFree={diskFree}
            diskWarn={diskWarn}
            diskTone={diskTone}
            memUsedPct={memUsedPct}
            memWarn={memWarn}
            memTone={memTone}
            memData={memData}
            trafficData={trafficData}
            testServer={testServer}
            testServerBusy={testServerBusy}
            testServerMsg={testServerMsg}
            refreshTestServer={refreshTestServer}
            openExecModal={openExecModal}
            alertConfig={alertConfig}
            alertMsg={alertMsg}
            alertTesting={alertTesting}
            handleAlertTest={handleAlertTest}
            openLogsForError={openLogsForError}
          />
        ) : section === 'logs' ? (
          <DevLogViewer initialLevel={logJump.level} initialKeyword={logJump.keyword} />
        ) : section === 'analytics' ? (
          <ApiAnalyticsViewer />
        ) : section === 'ips' ? (
          <DevIpManager />
        ) : (
          <AnnouncementManager />
        )}
      </div>

      <DevMainModals
        showPwModal={showPwModal}
        setShowPwModal={setShowPwModal}
        oldPw={oldPw}
        setOldPw={setOldPw}
        newPw={newPw}
        setNewPw={setNewPw}
        pwError={pwError}
        pwLoading={pwLoading}
        onPasswordChange={handlePasswordChange}
        showExecModal={showExecModal}
        setShowExecModal={setShowExecModal}
        execAction={execAction}
        execId={execId}
        setExecId={setExecId}
        execPw={execPw}
        setExecPw={setExecPw}
        execError={execError}
        testServerBusy={testServerBusy}
        onExecConfirm={handleExecConfirm}
      />
    </div>
  );
};

export default DevMain;
