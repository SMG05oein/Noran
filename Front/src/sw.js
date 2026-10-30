/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

self.skipWaiting();
clientsClaim();

const manifest = self.__WB_MANIFEST || [];
precacheAndRoute(manifest);
cleanupOutdatedCaches();

registerRoute(
  ({ url }) => /\/assets\/version\.json$/i.test(url.pathname),
  new NetworkOnly()
);

// 개발(dev-sw)에서는 index.html이 프리캐시에 없을 수 있음 → 그때는 SPA 폴백 생략
const indexEntry = manifest.find((entry) => {
  const url = typeof entry === 'string' ? entry : entry?.url;
  return url === 'index.html' || url === '/index.html';
});
if (indexEntry) {
  const indexUrl = typeof indexEntry === 'string' ? indexEntry : indexEntry.url;
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL(indexUrl), {
      denylist: [/^\/api\//, /^\/swagger-ui/, /^\/v3\/api-docs/],
    })
  );
}

/** 테스트 환경(testwww.dwaeji.kr 또는 로컬) 여부 확인 */
function isTestServer() {
  const host = self.location.hostname || '';
  return host.includes('test') || host === 'localhost' || host === '127.0.0.1';
}

/** Back이 /calendar 를 보내지만 Front 메인 캘린더는 / */
function resolveNotificationUrl(raw) {
  if (!raw || typeof raw !== 'string') return '/';
  let path = raw.trim();
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const parsed = new URL(path);
      path = parsed.pathname + parsed.search + parsed.hash;
    } catch {
      path = '/';
    }
  }
  if (path === '/calendar') return '/';
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

self.addEventListener('push', (event) => {
  let payload = {
    title: '노란돼지',
    body: '새 알림이 있습니다.',
    data: {},
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        data: parsed.data || {},
      };
    }
  } catch {
    try {
      const text = event.data?.text?.();
      if (text) payload.body = text;
    } catch {
      /* ignore */
    }
  }

  // 테스트 서버 환경이고 제목에 아직 '테스트' 표시가 없는 경우 [테스트] 접두사 추가
  const isTest = isTestServer();
  const notificationTitle = isTest && !payload.title.includes('테스트')
    ? `[테스트] ${payload.title}`
    : payload.title;

  event.waitUntil(
    self.registration.showNotification(notificationTitle, {
      body: payload.body,
      icon: '/pig.png',
      badge: '/pig.png',
      data: payload.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = resolveNotificationUrl(event.notification.data?.url);
  // 현재 서비스 워커가 동작 중인 환경의 origin(테스트 서버: testwww.dwaeji.kr / 실서버: dwaeji.kr)을 기준으로 절대 URL 생성
  const absoluteUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    (async () => {
      try {
        const allClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        // 현재 서비스 워커와 동일한 origin(테스트 서버 vs 실 배포 서버 구분)의 클라이언트 창 탐색
        let matchingClient = null;
        for (const client of allClients) {
          if (!client.url) continue;
          try {
            const clientOrigin = new URL(client.url).origin;
            if (clientOrigin === self.location.origin) {
              matchingClient = client;
              break;
            }
          } catch {
            /* ignore url parse error */
          }
        }

        if (matchingClient) {
          let focusedClient = null;
          // 1. 창을 최우선으로 포커스하여 포그라운드로 띄움 (Android 백그라운드 hang 방지)
          if ('focus' in matchingClient) {
            try {
              focusedClient = await matchingClient.focus();
            } catch (focusErr) {
              console.warn('[SW] client.focus failed:', focusErr);
            }
          }

          const targetClient = focusedClient || matchingClient;

          // 2. React Router SPA 라우팅을 위한 postMessage 전달
          try {
            targetClient.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetPath,
            });
          } catch (postErr) {
            console.warn('[SW] postMessage failed:', postErr);
          }

          // 3. 포커스 완료 후 필요 시 navigate 보조 시도
          if ('navigate' in targetClient) {
            try {
              if (targetClient.url !== absoluteUrl) {
                await targetClient.navigate(absoluteUrl);
              }
            } catch (navErr) {
              console.warn('[SW] client.navigate failed:', navErr);
            }
          }

          // 정상적으로 포커스된 경우 종료
          if (focusedClient) {
            return;
          }
        }

        // 일치하는 기존 탭이 없거나 포커스에 실패한 경우 새 창으로 열기
        if (self.clients.openWindow) {
          await self.clients.openWindow(absoluteUrl);
        }
      } catch (err) {
        console.error('[SW] notificationclick handling failed:', err);
        if (self.clients.openWindow) {
          try {
            await self.clients.openWindow(absoluteUrl);
          } catch (openErr) {
            console.error('[SW] openWindow fallback failed:', openErr);
          }
        }
      }
    })()
  );
});
