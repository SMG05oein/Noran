import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Spinner } from 'react-bootstrap';
import { fetchAllowedIps, addAllowedIp, deleteAllowedIp } from '../api/devAuthApi';

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

/** IPv4 / IPv6 단일 주소만 허용 (CIDR, 대역, zone id 불가) */
export const isValidIp = (value) => {
  const v = (value || '').trim();
  if (!v) return false;
  if (IPV4_RE.test(v)) return true;
  if (!v.includes(':') || !/^[0-9a-fA-F:.]+$/.test(v)) return false;
  try {
    // eslint-disable-next-line no-new
    new URL(`http://[${v}]/`);
    return true;
  } catch {
    return false;
  }
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('ko-KR');
};

const IpSection = ({
  type,
  title,
  rows,
  myIp,
  restrictionEnabled,
  blockEnabled,
  configIps,
  notice,
  onChanged,
  showToast,
}) => {
  const [ip, setIp] = useState('');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const isBlock = type === 'SERVICE';

  const submit = async () => {
    setBusy(true);
    const res = await addAllowedIp({ type, ip: ip.trim(), memo: memo.trim() });
    if (res.success) {
      showToast(isBlock ? `${ip.trim()} 차단되었습니다.` : `${ip.trim()} 등록되었습니다.`);
      setIp('');
      setMemo('');
      await onChanged();
    } else {
      showToast(res.error, 'bad');
    }
    setBusy(false);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!isValidIp(ip)) {
      showToast('올바른 IPv4/IPv6 주소를 입력하세요. (대역/CIDR 불가)', 'bad');
      return;
    }
    if (memo.length > 100) {
      showToast(isBlock ? '차단 사유는 100자 이내로 입력하세요.' : '메모는 100자 이내로 입력하세요.', 'bad');
      return;
    }
    if (isBlock) {
      if (!window.confirm(`${ip.trim()}를 차단하면 이 IP는 서비스에 접속할 수 없습니다. 계속할까요?`)) {
        return;
      }
    }
    submit();
  };

  const handleDelete = async (row) => {
    const msg = isBlock
      ? `${row.ip} 차단을 해제하시겠습니까?`
      : `${row.ip} 을(를) 삭제하시겠습니까?`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    const res = await deleteAllowedIp(row.id);
    if (res.success) {
      showToast(isBlock ? `${row.ip} 차단이 해제되었습니다.` : `${row.ip} 삭제되었습니다.`);
      await onChanged();
    } else {
      showToast(res.error, 'bad');
    }
    setBusy(false);
  };

  const statusBadge = isBlock ? (
    blockEnabled ? (
      <span className="dc-pill dc-pill-bad">{rows.length}개 IP 차단 중</span>
    ) : (
      <span className="dc-pill dc-pill-muted">차단 IP 없음</span>
    )
  ) : restrictionEnabled ? (
    <span className="dc-pill dc-pill-ok">제한 활성</span>
  ) : (
    <span className="dc-pill dc-pill-warn">제한 비활성 · 허용 IP가 없어 모든 IP 접근 가능</span>
  );

  return (
    <div className="dc-panel mb-3">
      <div className="dc-panel-head">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <h2 className="dc-panel-title mb-0">{title}</h2>
          {statusBadge}
        </div>
      </div>
      <div className="dc-panel-body">
        {!isBlock && (
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <span>내 현재 IP: <strong>{myIp || '—'}</strong></span>
            <button
              type="button"
              className="dc-btn dc-btn-ghost"
              disabled={!myIp}
              onClick={() => setIp(myIp)}
            >
              내 IP로 입력
            </button>
          </div>
        )}
        {notice && <div className="dc-alert mb-3">{notice}</div>}

        {configIps?.length > 0 && (
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <span className="dc-pill dc-pill-muted">서버 설정</span>
            {configIps.map((c) => (
              <span key={c} className="dc-pill dc-pill-info">
                {c}
                {c === myIp && ' (현재 접속 중)'}
              </span>
            ))}
            <span style={{ color: 'var(--dc-muted)', fontSize: '0.8rem' }}>읽기 전용</span>
          </div>
        )}

        <div className="dc-table-wrap mb-3">
          <table className="dc-table">
            <thead>
              <tr>
                <th>IP</th>
                <th>{isBlock ? '차단 사유' : '메모'}</th>
                <th>등록자</th>
                <th>등록일</th>
                <th style={{ width: isBlock ? 110 : 90 }}>{isBlock ? '차단 해제' : '삭제'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="dc-empty">
                      {isBlock ? '차단된 IP가 없습니다.' : '등록된 IP가 없습니다.'}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isMine = !!myIp && r.ip === myIp;
                  return (
                    <tr key={r.id}>
                      <td>
                        {r.ip}
                        {!isBlock && isMine && (
                          <span className="dc-pill dc-pill-ok ms-2">현재 접속 중</span>
                        )}
                      </td>
                      <td>{r.memo || '—'}</td>
                      <td>{r.createdBy || '—'}</td>
                      <td>{formatDate(r.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="dc-btn dc-btn-danger"
                          disabled={busy || (!isBlock && isMine)}
                          title={!isBlock && isMine ? '현재 접속 중인 IP는 삭제할 수 없습니다.' : undefined}
                          onClick={() => handleDelete(r)}
                        >
                          {isBlock ? '차단 해제' : '삭제'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleAdd} className="d-flex flex-wrap align-items-center gap-2">
          <input
            className="form-control form-control-sm"
            placeholder={isBlock ? '차단할 IP (IPv4/IPv6)' : 'IP (IPv4/IPv6)'}
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            style={{ width: 220 }}
          />
          <input
            className="form-control form-control-sm"
            placeholder={isBlock ? '차단 사유 (100자 이내)' : '메모 (100자 이내)'}
            value={memo}
            maxLength={100}
            onChange={(e) => setMemo(e.target.value)}
            style={{ width: 260 }}
          />
          <button type="submit" className="dc-btn dc-btn-accent" disabled={busy || !ip.trim()}>
            {busy ? '…' : isBlock ? '차단 추가' : '추가'}
          </button>
        </form>
      </div>
    </div>
  );
};

const DevIpManager = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'ok') => {
    setToast({ message, type });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const load = useCallback(async () => {
    const res = await fetchAllowedIps();
    if (res.success) setData(res.data);
    else showToast(res.error, 'bad');
    setLoading(false);
  }, [showToast]);

  // 진입 시 1회 조회 (폴링 없음)
  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="dc-center"><Spinner animation="border" size="sm" /></div>;
  }

  return (
    <div>
      {toast && (
        <div className={`dc-alert ${toast.type === 'bad' ? 'dc-alert-bad' : 'dc-alert-ok'} mb-3`} role="status">
          {toast.message}
        </div>
      )}
      {!data ? (
        <div className="dc-center">IP 정보를 불러오지 못했습니다.</div>
      ) : (
        <>
          <IpSection
            type="DEV"
            title="개발자 대시보드 허용 IP"
            rows={data.devIps || []}
            myIp={data.myIp}
            restrictionEnabled={!!data.devRestrictionEnabled}
            configIps={data.devConfigIps || []}
            onChanged={load}
            showToast={showToast}
          />
          <IpSection
            type="SERVICE"
            title="서비스(dwaeji.kr) 접근 차단 IP"
            rows={data.serviceIps || []}
            myIp={data.myIp}
            blockEnabled={!!data.serviceBlockEnabled}
            notice="차단된 IP는 서비스에 접속하면 418(I'm a teapot)을 받습니다. 개발자 허용 IP와 서버 내부(127.0.0.1)는 차단되지 않습니다."
            onChanged={load}
            showToast={showToast}
          />
        </>
      )}
    </div>
  );
};

export default DevIpManager;
