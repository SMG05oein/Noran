import React from 'react';

export const NAV = [
  { key: 'overview', label: '현황' },
  { key: 'logs', label: '로그' },
  { key: 'analytics', label: 'API 통계' },
  { key: 'announcements', label: '공지·점검' },
  { key: 'ips', label: 'IP' },
];

export const formatUptime = (seconds = 0) => {
  const s = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}시간 ${m}분 ${sec}초`;
};

/** recent_errors.requestPage 만 표시 (없으면 알 수 없음). 스킴 없으면 https:// 보정 */
export const formatRequestPage = (err) => {
  const page = (err?.requestPage || '').trim();
  if (!page) return '알 수 없음';
  if (/^https?:\/\//i.test(page)) return page;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#]|$)/i.test(page)) {
    return `https://${page}`;
  }
  return page;
};

export const StatusPill = ({ ok, label, unknown, tone }) => {
  if (unknown) return <span className="dc-pill dc-pill-muted">{label || '없음'}</span>;
  const resolved = tone || (ok ? 'ok' : 'bad');
  const cls = resolved === 'ok' ? 'dc-pill-ok' : resolved === 'warn' ? 'dc-pill-warn' : 'dc-pill-bad';
  return <span className={`dc-pill ${cls}`}>{label || (resolved === 'ok' ? '정상' : resolved === 'warn' ? '주의' : '이상')}</span>;
};

export const tooltipStyle = {
  backgroundColor: '#161b22',
  border: '1px solid #30363d',
  borderRadius: 6,
  color: '#e6edf3',
  fontSize: 12,
};

