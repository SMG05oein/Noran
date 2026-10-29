/** VAPID base64url → Uint8Array (PushManager.subscribe applicationServerKey) */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/** iOS는 홈 화면 추가(PWA) 후에만 웹 푸시 가능 */
export function needsIosPwaInstall() {
  return isIosDevice() && !isStandaloneDisplay();
}

export function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('이 브라우저는 서비스 워커를 지원하지 않습니다.');
  }
  return navigator.serviceWorker.ready;
}

export async function getExistingPushSubscription() {
  if (!isPushSupported()) return null;
  try {
    const reg = await getServiceWorkerRegistration();
    return reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** 브라우저 알림 권한만 먼저 요청 (프롬프트를 즉시 띄움) */
export async function ensureNotificationPermission() {
  if (!isPushSupported()) {
    throw new Error('이 브라우저는 웹 푸시를 지원하지 않습니다.');
  }
  if (needsIosPwaInstall()) {
    throw new Error('iOS에서는 홈 화면에 추가한 앱에서만 알림을 받을 수 있습니다.');
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') {
    const err = new Error('알림 권한이 거부되어 있습니다. 브라우저 설정에서 허용해 주세요.');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    const err = new Error(
      permission === 'denied'
        ? '알림 권한이 거부되어 있습니다. 브라우저 설정에서 허용해 주세요.'
        : '알림 권한이 허용되지 않았습니다.'
    );
    err.code = 'PERMISSION_DENIED';
    throw err;
  }
  return permission;
}

/**
 * 권한 허용 후 pushManager.subscribe → PushSubscription.toJSON()
 * @param {string} vapidPublicKey base64url VAPID public key
 * @param {{ skipPermission?: boolean }} [options]
 */
export async function subscribeWebPush(vapidPublicKey, options = {}) {
  if (!isPushSupported()) {
    throw new Error('이 브라우저는 웹 푸시를 지원하지 않습니다.');
  }
  if (needsIosPwaInstall()) {
    throw new Error('iOS에서는 홈 화면에 추가한 앱에서만 알림을 받을 수 있습니다.');
  }
  if (!vapidPublicKey) {
    throw new Error('VAPID 공개키가 없습니다.');
  }

  if (!options.skipPermission) {
    await ensureNotificationPermission();
  } else if (Notification.permission !== 'granted') {
    const err = new Error('알림 권한이 허용되지 않았습니다.');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const reg = await getServiceWorkerRegistration();
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }
  return subscription.toJSON();
}

/** 로컬 구독 해제. 서버 DELETE용 endpoint를 반환(없으면 null) */
export async function unsubscribeLocalPush() {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return null;
  const json = subscription.toJSON();
  await subscription.unsubscribe();
  return json?.endpoint || null;
}
