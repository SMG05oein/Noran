import React, { useState, useEffect, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  fetchApiAnalytics,
  fetchSlowEndpoints,
  fetchStatusBreakdown,
  fetchHourlyTrend,
} from '../api/devAuthApi';

const HOUR_OPTIONS = [
  { value: '1', label: '최근 1시간' },
  { value: '6', label: '최근 6시간' },
  { value: '24', label: '최근 24시간' },
  { value: '168', label: '최근 7일' },
];

const STATUS_KEYS = ['total', '2xx', '3xx', '4xx', '5xx', '429'];

const formatDelta = (n) => {
  if (n == null || n === 0) return { text: '±0', cls: 'dc-delta-flat' };
  if (n > 0) return { text: `+${n}`, cls: 'dc-delta-up' };
  return { text: `${n}`, cls: 'dc-delta-down' };
};

const methodClass = (method) => {
  switch (String(method || '').toUpperCase()) {
    case 'GET': return 'dc-pill-ok';
    case 'POST': return 'dc-pill-info';
    case 'PUT': return 'dc-pill-warn';
    case 'DELETE': return 'dc-pill-bad';
    default: return 'dc-pill-muted';
  }
};

const slowRowClass = (avg) => {
  if (avg == null) return '';
  if (avg >= 1000) return 'dc-row-critical';
  if (avg >= 500) return 'dc-row-slow';
  return '';
};

const ApiAnalyticsViewer = () => {
  const [hours, setHours] = useState('24');
  /** 'period' = 선택 기간 flat 필드, 'lifetime' = Redis 전체 누적 */
  const [statusScope, setStatusScope] = useState('period');
  const [analytics, setAnalytics] = useState([]);
  const [slow, setSlow] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    const h = Number(hours) || 24;
    const [topRes, slowRes, statusRes, trendRes] = await Promise.all([
      fetchApiAnalytics({ hours: h, limit: 10 }),
      fetchSlowEndpoints({ hours: h, limit: 10 }),
      fetchStatusBreakdown(h),
      fetchHourlyTrend(h),
    ]);
    setAnalytics(topRes.success && Array.isArray(topRes.data) ? topRes.data : []);
    setSlow(slowRes.success && Array.isArray(slowRes.data) ? slowRes.data : []);
    setBreakdown(statusRes.success ? statusRes.data : null);
    setTrend(trendRes.success && Array.isArray(trendRes.data) ? trendRes.data : []);
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, [hours]);

  const maxCount = analytics.length > 0 ? Math.max(...analytics.map((a) => a.count || 1)) : 1;

  const chartTrend = useMemo(() => {
    // 7일이면 라벨 과밀 → 6시간 단위로 축약 표시용 원본 유지, 차트는 그대로
    if (trend.length > 48) {
      return trend.filter((_, i) => i % 3 === 0 || i === trend.length - 1);
    }
    return trend;
  }, [trend]);

  const lifetime = breakdown?.lifetime || null;
  const useLifetime = statusScope === 'lifetime' && !!lifetime;
  const statusSource = useLifetime ? lifetime : breakdown;

  const tooltipStyle = {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#e6edf3',
    fontSize: 12,
  };

  return (
    <div className="d-flex flex-column gap-3">
      <div className="dc-panel">
        <div className="dc-panel-head">
          <h2 className="dc-panel-title">조회 기간</h2>
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              style={{ width: 150 }}
            >
              {HOUR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button type="button" className="dc-btn dc-btn-ghost" onClick={loadAnalytics} disabled={loading}>
              {loading ? '로딩…' : '새로고침'}
            </button>
          </div>
        </div>
        <div className="dc-panel-body" style={{ paddingTop: '0.65rem' }}>
          <p className="mb-0 small" style={{ color: 'var(--dc-muted)' }}>
            이전 동일 구간과 비교 · 시간대별 호출 추이 · 느린 API(평균 ≥500ms 주의, ≥1s 위험)
          </p>
        </div>
      </div>

      {breakdown && statusSource && (
        <div className="dc-panel">
          <div className="dc-panel-head">
            <h2 className="dc-panel-title">상태코드 통계</h2>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="dc-seg" role="group" aria-label="상태코드 집계 범위">
                <button
                  type="button"
                  className={`dc-seg-btn ${!useLifetime ? 'active' : ''}`}
                  onClick={() => setStatusScope('period')}
                >
                  기간 ({hours}h)
                </button>
                <button
                  type="button"
                  className={`dc-seg-btn ${useLifetime ? 'active' : ''}`}
                  onClick={() => setStatusScope('lifetime')}
                  disabled={!lifetime}
                  title={lifetime ? 'Redis 전체 누적 (배포 후에도 유지)' : 'lifetime 데이터 없음'}
                >
                  전체(누적)
                </button>
              </div>
              <span className="dc-mono" style={{ color: 'var(--dc-muted)', fontSize: '0.72rem' }}>
                TOTAL(기간) {breakdown.total ?? 0}
                {lifetime?.total != null ? ` · TOTAL(전체) ${lifetime.total}` : ''}
              </span>
            </div>
          </div>
          <div className="dc-panel-body" style={{ paddingTop: '0.65rem' }}>
            <div className="dc-status-row" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', marginBottom: 0 }}>
              {STATUS_KEYS.map((key) => {
                const delta = !useLifetime ? formatDelta(breakdown.delta?.[key]) : null;
                return (
                  <div key={key} className="dc-stat" style={{ minHeight: 72 }}>
                    <div className="dc-stat-label">
                      {key}{useLifetime ? ' · 전체' : ` · ${hours}h`}
                    </div>
                    <div className="dc-stat-value">{statusSource[key] ?? 0}</div>
                    {useLifetime ? (
                      <div className="dc-stat-meta">Redis 누적</div>
                    ) : (
                      <div className={`dc-stat-meta ${delta.cls}`}>
                        이전 대비 {delta.text}
                        {breakdown.previous?.[key] != null ? ` (이전 ${breakdown.previous[key]})` : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {!lifetime && (
              <p className="mb-0 mt-2 small" style={{ color: 'var(--dc-muted)' }}>
                전체(누적)은 백엔드 lifetime 필드 배포 후 표시됩니다.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="dc-panel">
        <div className="dc-panel-head">
          <h2 className="dc-panel-title">시간대별 호출 추이</h2>
          <span className="dc-mono" style={{ color: 'var(--dc-muted)', fontSize: '0.75rem' }}>
            {hours}h · 호출 수 / 5xx
          </span>
        </div>
        <div className="dc-panel-body">
          {loading ? (
            <div className="dc-empty"><Spinner animation="border" size="sm" /></div>
          ) : chartTrend.length > 0 ? (
            <div className="dc-chart" style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={chartTrend} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8b949e' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#8b949e' }} />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
                  <Bar dataKey="total" name="호출" fill="#58a6ff" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="s5xx" name="5xx" fill="#f85149" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dc-empty">추이 데이터가 없습니다. (백엔드 배포 후 수집됩니다)</div>
          )}
        </div>
      </div>

      <div className="dc-panel">
        <div className="dc-panel-head">
          <h2 className="dc-panel-title">API 호출 Top 10 ({hours}h)</h2>
        </div>
        <div className="dc-panel-body tight">
          {loading ? (
            <div className="dc-empty"><Spinner animation="border" size="sm" /></div>
          ) : analytics.length > 0 ? (
            <div className="dc-table-wrap">
              <table className="dc-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>메소드</th>
                    <th>경로</th>
                    <th>호출</th>
                    <th>평균</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((item, idx) => {
                    const avg = item.avgResponseTimeMs;
                    return (
                      <tr key={`${item.method}-${item.path}-${idx}`} className={slowRowClass(avg)}>
                        <td>#{idx + 1}</td>
                        <td>
                          <span className={`dc-pill ${methodClass(item.method)}`}>{item.method}</span>
                        </td>
                        <td className="dc-mono">{item.path}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              style={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                background: '#30363d',
                                overflow: 'hidden',
                                minWidth: 60,
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.max(4, (item.count / maxCount) * 100)}%`,
                                  height: '100%',
                                  background: '#58a6ff',
                                }}
                              />
                            </div>
                            <span className="dc-mono">{item.count}</span>
                          </div>
                        </td>
                        <td className="dc-mono">
                          {typeof avg === 'number' ? `${avg.toFixed(1)} ms` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dc-empty">수집된 API 통계가 없습니다.</div>
          )}
        </div>
      </div>

      <div className="dc-panel">
        <div className="dc-panel-head">
          <h2 className="dc-panel-title">느린 엔드포인트 Top 10</h2>
        </div>
        <div className="dc-panel-body tight">
          {loading ? (
            <div className="dc-empty"><Spinner animation="border" size="sm" /></div>
          ) : slow.length > 0 ? (
            <div className="dc-table-wrap">
              <table className="dc-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>메소드</th>
                    <th>경로</th>
                    <th>호출</th>
                    <th>평균</th>
                    <th>최대</th>
                  </tr>
                </thead>
                <tbody>
                  {slow.map((item, idx) => {
                    const avg = item.avgResponseTimeMs;
                    return (
                      <tr key={`slow-${item.method}-${item.path}-${idx}`} className={slowRowClass(avg)}>
                        <td>#{idx + 1}</td>
                        <td>
                          <span className={`dc-pill ${methodClass(item.method)}`}>{item.method}</span>
                        </td>
                        <td className="dc-mono">{item.path}</td>
                        <td>{item.count}</td>
                        <td className="dc-mono" style={{ color: avg >= 500 ? 'var(--dc-warn)' : undefined }}>
                          {typeof avg === 'number' ? `${avg.toFixed(1)} ms` : '—'}
                        </td>
                        <td className="dc-mono" style={{ color: 'var(--dc-danger)' }}>
                          {item.maxResponseTimeMs != null ? `${item.maxResponseTimeMs} ms` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dc-empty">느린 엔드포인트 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiAnalyticsViewer;
