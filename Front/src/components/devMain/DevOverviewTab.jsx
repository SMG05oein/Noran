import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { StatusPill, formatUptime, formatRequestPage, tooltipStyle } from './devMainUtils';

const DevOverviewTab = ({
  sysInfo,
  status,
  health,
  version,
  host,
  overall,
  fetchedLabel,
  dbOk,
  dbLatency,
  dbTone,
  diskFree,
  diskWarn,
  diskTone,
  memUsedPct,
  memWarn,
  memTone,
  memData,
  trafficData,
  testServer,
  testServerBusy,
  testServerMsg,
  refreshTestServer,
  openExecModal,
  alertConfig,
  alertMsg,
  alertTesting,
  handleAlertTest,
  openLogsForError,
}) => {
  return (
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

      <div className="dc-panel" style={{ marginBottom: '1rem' }}>
        <div className="dc-panel-head">
          <h2 className="dc-panel-title">테스트 서버</h2>
          <button
            type="button"
            className="dc-btn"
            disabled={testServerBusy}
            onClick={() => refreshTestServer()}
          >
            새로고침
          </button>
        </div>
        <div className="dc-panel-body">
          <dl className="dc-kv">
            <dt>상태</dt>
            <dd>
              {!testServer ? (
                <StatusPill unknown label="조회 중" />
              ) : testServer.controlAvailable === false ? (
                <StatusPill unknown label="이 인스턴스에서 제어 불가" />
              ) : (
                <StatusPill
                  ok={!!testServer.running && !!testServer.healthy}
                  tone={
                    testServer.running && testServer.healthy ? 'ok'
                      : testServer.running ? 'warn'
                        : 'bad'
                  }
                  label={
                    testServer.running && testServer.healthy ? '실행 중'
                      : testServer.running ? '실행 중 · 헬스 실패'
                        : '중지됨'
                  }
                />
              )}
            </dd>
            <dt>포트 / PID</dt>
            <dd className="dc-mono">
              {testServer?.port ?? '8082'}
              {testServer?.pid ? ` · PID ${testServer.pid}` : ''}
            </dd>
            <dt>URL</dt>
            <dd>
              {testServer?.wwwUrl ? (
                <a href={testServer.wwwUrl} target="_blank" rel="noreferrer">{testServer.wwwUrl}</a>
              ) : 'https://testwww.dwaeji.kr'}
              {' · '}
              {testServer?.apiUrl ? (
                <a href={testServer.apiUrl} target="_blank" rel="noreferrer">{testServer.apiUrl}</a>
              ) : 'https://testapi.dwaeji.kr'}
            </dd>
            <dt>스크립트</dt>
            <dd className="dc-mono">{testServer?.script || '/home/opc/deploy-test.sh'}</dd>
          </dl>
          {testServerMsg && (
            <div
              className={`dc-alert ${testServerMsg.includes('실패') ? 'dc-alert-bad' : 'dc-alert-ok'}`}
              style={{ marginTop: '0.75rem' }}
            >
              {testServerMsg}
            </div>
          )}
          <div className="dc-ops-bar" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="dc-btn dc-btn-accent"
              disabled={testServerBusy || testServer?.controlAvailable === false || !!testServer?.running}
              onClick={() => openExecModal('start')}
            >
              실행
            </button>
            <button
              type="button"
              className="dc-btn"
              disabled={testServerBusy || testServer?.controlAvailable === false || !testServer?.running}
              onClick={() => openExecModal('stop')}
            >
              끄기
            </button>
            <button
              type="button"
              className="dc-btn"
              disabled={testServerBusy || testServer?.controlAvailable === false || !testServer?.jarExists}
              onClick={() => openExecModal('restart')}
              title="현재 JAR 그대로 끄고 다시 켭니다 (env 수정 후 등)"
            >
              재실행
            </button>
            <button
              type="button"
              className="dc-btn"
              disabled={testServerBusy || testServer?.controlAvailable === false}
              onClick={() => openExecModal('deploy')}
            >
              JAR 재기동
            </button>
            <span className="dc-ops-hint">
              executor ID/PW 필요. basic auth는 서버 `/etc/nginx/.htpasswd-testwww` 에서 설정.
            </span>
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
  );
};

export default DevOverviewTab;

