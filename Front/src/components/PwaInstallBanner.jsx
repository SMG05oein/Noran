import React, { useEffect, useState } from 'react';
import { RiCloseLine, RiShareForwardLine } from 'react-icons/ri';
import './PwaInstallBanner.css';

/**
 * 모바일 전용 PWA 설치 안내 배너
 * - 모바일(non-standalone)이면 무조건 표시
 * - iOS:     공유 버튼 → 홈 화면에 추가 안내
 * - Android: Chrome 메뉴(⋮) → 앱 설치 경로 안내
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
  const [iosDevice, setIosDevice] = useState(false);

  useEffect(() => {
    const debugMode = new URLSearchParams(window.location.search).get('debug_pwa') === '1';

    if (!debugMode && !isMobile()) return;
    if (isStandalone()) return;
    if (!debugMode && sessionStorage.getItem(SESSION_KEY)) return;

    setIosDevice(isIos());
    setShow(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="pwa-banner" role="banner" aria-label="앱 설치 안내">
      <div className="pwa-banner__icon">
        <img src="/pig.png" alt="노란돼지" width={40} height={40} />
      </div>

      <div className="pwa-banner__body">
        <p className="pwa-banner__title">앱으로 더 편하게!</p>
        {iosDevice ? (
          <p className="pwa-banner__desc">
            <RiShareForwardLine className="pwa-banner__share-icon" />
            하단 공유 버튼 &rarr; <strong>홈 화면에 추가</strong> 탭
          </p>
        ) : (
          <p className="pwa-banner__desc">
            Chrome 메뉴(⋮) &rarr; <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong> 탭
          </p>
        )}
      </div>

      <button className="pwa-banner__close" onClick={dismiss} aria-label="배너 닫기">
        <RiCloseLine size={20} />
      </button>
    </div>
  );
};

export default PwaInstallBanner;
