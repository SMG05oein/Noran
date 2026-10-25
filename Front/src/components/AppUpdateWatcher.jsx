import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { APP_VERSION } from '../config/version';
import './AppUpdateWatcher.css';

const RELOAD_KEY = 'app_update_reloaded_for';

/** 정리는 백그라운드로 던지고, 이동은 즉시 */
const reloadNow = () => {
  try {
    navigator.serviceWorker?.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  } catch {
    /* ignore */
  }
  try {
    caches?.keys?.().then((keys) => {
      keys.forEach((k) => caches.delete(k));
    });
  } catch {
    /* ignore */
  }
  const next = `${window.location.origin}${window.location.pathname}?_app_v=${Date.now()}${window.location.hash || ''}`;
  window.location.href = next;
};

const stripAppVersionQuery = () => {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('_app_v')) return;
    url.searchParams.delete('_app_v');
    const clean = `${url.pathname}${url.search ? `?${url.searchParams}` : ''}${url.hash}`;
    window.history.replaceState({}, '', clean);
  } catch {
    /* ignore */
  }
};

const AppUpdateWatcher = () => {
  const [updating, setUpdating] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState('');
  const [debugPreview, setDebugPreview] = useState(false);

  useEffect(() => {
    stripAppVersionQuery();

    // 개발 미리보기: /?debug_update=1  (새로고침 안 함, 배너만 표시)
    const debug = new URLSearchParams(window.location.search).get('debug_update') === '1';
    if (debug) {
      setRemoteVersion(APP_VERSION || 'v0.0.0');
      setUpdating(true);
      setDebugPreview(true);
      return undefined;
    }

    let checking = false;
    let cancelled = false;

    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      if (checking || cancelled) return;
      checking = true;
      try {
        const res = await fetch(`/assets/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return;

        const data = await res.json();
        const remote = data?.version;
        if (!remote) return;

        if (remote === APP_VERSION) {
          sessionStorage.removeItem(RELOAD_KEY);
          return;
        }

        if (sessionStorage.getItem(RELOAD_KEY) === remote) return;

        console.info('[app-update] 새 버전 감지', { local: APP_VERSION, remote });
        sessionStorage.setItem(RELOAD_KEY, remote);
        if (cancelled) return;

        flushSync(() => {
          setRemoteVersion(remote);
          setUpdating(true);
        });
        await new Promise((r) => setTimeout(r, 50)); // 0.05초 — 오버레이 노출
        if (!cancelled) reloadNow();
      } catch (e) {
        console.warn('[app-update] 확인 중 오류', e);
      } finally {
        checking = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (!updating) return null;

  return (
    <div
      className="app-update-overlay"
      role="status"
      aria-live="assertive"
      onClick={debugPreview ? () => setUpdating(false) : undefined}
    >
      <div className="app-update-card" onClick={(e) => debugPreview && e.stopPropagation()}>
        <div className="app-update-icon" aria-hidden>
          <img src="/pig.png" alt="" />
          <span className="app-update-icon__ring" />
        </div>
        <div className="app-update-body">
          <p className="app-update-title">업데이트를 준비하는 중이에요</p>
          <p className="app-update-desc">
            새 버전으로 곧 새로고침됩니다
            {remoteVersion ? (
              <span className="app-update-badge">{remoteVersion}</span>
            ) : null}
          </p>
          {debugPreview && (
            <p className="app-update-desc" style={{ marginTop: 6, opacity: 0.75 }}>
              미리보기 모드 · 바깥 클릭하면 닫힘
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppUpdateWatcher;
