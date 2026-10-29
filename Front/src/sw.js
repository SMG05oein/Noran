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

/** Back이 /calendar 를 보내지만 Front 메인 캘린더는 / */
function resolveNotificationUrl(raw) {
  if (!raw || typeof raw !== 'string') return '/';
  if (raw === '/calendar') return '/';
  return raw;
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

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pig.png',
      badge: '/pig.png',
      data: payload.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = resolveNotificationUrl(event.notification.data?.url);

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* ignore navigate failure */
            }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })()
  );
});
