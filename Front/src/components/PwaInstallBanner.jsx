import React, { useEffect, useState } from 'react';
import { RiDownloadLine, RiCloseLine, RiShareForwardLine } from 'react-icons/ri';
import './PwaInstallBanner.css';

/**
 * 모바일 전용 PWA 설치 안내 배너
 * - Android: beforeinstallprompt 이벤트로 네이티브 설치 유도
 * - iOS:     Safari 공유 버튼 → "홈 화면에 추가" 안내
 * - 이미 standalone 모드면 표시 안 함
 * - sessionStorage에 닫은 기록 저장 → 세션 내 재표시 없음
 */

const SESSION_KEY = 'pwa_banner_dismissed';

function isMobile() {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

const PwaInstallBanner = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    // 조건 체크
    if (!isMobile()) return;
    if (isStandalone()) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    if (isIos()) {
      setIos(true);
      setShow(true);
      return;
    }

    // Android: beforeinstallprompt 이벤트 대기
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    dismiss();
  };

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="pwa-banner" role="banner" aria-label="앱 설치 안내">
      <div className="pwa-banner__icon">
        <img src="/logo192.png" alt="앱 아이콘" width={40} height={40} />
      </div>

      <div className="pwa-banner__body">
        <p className="pwa-banner__title">앱으로 더 편하게!</p>
        {ios ? (
          <p className="pwa-banner__desc">
            <RiShareForwardLine className="pwa-banner__share-icon" />
            공유 버튼 &rarr; <strong>홈 화면에 추가</strong>를 탭하세요
          </p>
        ) : (
          <p className="pwa-banner__desc">홈 화면에 설치하면 빠르게 접속할 수 있어요</p>
        )}
      </div>

      {!ios && (
        <button className="pwa-banner__cta" onClick={handleInstall} aria-label="앱 설치">
          <RiDownloadLine size={16} />
          설치
        </button>
      )}

      <button className="pwa-banner__close" onClick={dismiss} aria-label="배너 닫기">
        <RiCloseLine size={20} />
      </button>
    </div>
  );
};

export default PwaInstallBanner;
