import { useCallback, useEffect, useState } from 'react';
import {
  deleteAllPushSubscriptions,
  deletePushSubscription,
  fetchVapidPublicKey,
  savePushSubscription,
} from '../api/alarmApi';
import {
  ensureNotificationPermission,
  getExistingPushSubscription,
  getNotificationPermission,
  isPushSupported,
  needsIosPwaInstall,
  subscribeWebPush,
  unsubscribeLocalPush,
} from '../utils/webPush';

/**
 * 현재 기기 웹 푸시 구독 상태 및 연결/해제
 * 연결 = 권한 허용 + 구독 등록을 한 번에 처리
 */
export default function useWebPush() {
  const [supported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [subscribed, setSubscribed] = useState(false);
  const [endpoint, setEndpoint] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cachedVapidKey, setCachedVapidKey] = useState(null);
  const iosNeedsInstall = needsIosPwaInstall();

  const refresh = useCallback(async () => {
    setPermission(getNotificationPermission());
    if (!isPushSupported()) {
      setSubscribed(false);
      setEndpoint(null);
      return;
    }
    try {
      const sub = await getExistingPushSubscription();
      setSubscribed(!!sub);
      setEndpoint(sub?.endpoint || null);
    } catch {
      setSubscribed(false);
      setEndpoint(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // VAPID 키 미리 받아 두어, 권한 허용 직후 바로 구독까지 이어지게
  useEffect(() => {
    if (!supported || iosNeedsInstall) return undefined;
    let cancelled = false;
    (async () => {
      const keyRes = await fetchVapidPublicKey();
      if (!cancelled && keyRes.success && keyRes.data?.publicKey) {
        setCachedVapidKey(keyRes.data.publicKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported, iosNeedsInstall]);

  const connectThisDevice = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      // 1) 권한 프롬프트를 즉시 표시
      await ensureNotificationPermission();
      setPermission(getNotificationPermission());

      // 2) 이어서 구독 + 서버 등록 (같은 사용자 제스처 흐름)
      let publicKey = cachedVapidKey;
      if (!publicKey) {
        const keyRes = await fetchVapidPublicKey();
        if (!keyRes.success) {
          throw new Error(keyRes.error || 'VAPID 공개키를 불러오지 못했습니다.');
        }
        publicKey = keyRes.data?.publicKey;
        setCachedVapidKey(publicKey || null);
      }

      const json = await subscribeWebPush(publicKey, { skipPermission: true });
      const saveRes = await savePushSubscription(json);
      if (!saveRes.success) {
        throw new Error(saveRes.error || '구독 저장에 실패했습니다.');
      }
      setPermission(getNotificationPermission());
      setSubscribed(true);
      setEndpoint(json.endpoint || null);
      return { success: true };
    } catch (e) {
      const msg = e?.message || '이 기기 연결에 실패했습니다.';
      setError(msg);
      setPermission(getNotificationPermission());
      await refresh();
      return { success: false, error: msg, code: e?.code };
    } finally {
      setBusy(false);
    }
  }, [cachedVapidKey, refresh]);

  const disconnectThisDevice = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      const sub = await getExistingPushSubscription();
      const ep = sub?.endpoint || endpoint;
      if (ep) {
        const delRes = await deletePushSubscription(ep);
        if (!delRes.success) {
          throw new Error(delRes.error || '서버 구독 해제에 실패했습니다.');
        }
      }
      await unsubscribeLocalPush();
      setSubscribed(false);
      setEndpoint(null);
      return { success: true };
    } catch (e) {
      const msg = e?.message || '이 기기 해제에 실패했습니다.';
      setError(msg);
      await refresh();
      return { success: false, error: msg };
    } finally {
      setBusy(false);
    }
  }, [endpoint, refresh]);

  /** 알림 전체 OFF 시 계정 구독 전부 삭제 + 로컬 해제 */
  const disconnectAllDevices = useCallback(async () => {
    setError('');
    try {
      const delRes = await deleteAllPushSubscriptions();
      if (!delRes.success) {
        return { success: false, error: delRes.error };
      }
      try {
        await unsubscribeLocalPush();
      } catch {
        /* local cleanup best-effort */
      }
      setSubscribed(false);
      setEndpoint(null);
      return { success: true };
    } catch (e) {
      return { success: false, error: e?.message || '전체 구독 해제에 실패했습니다.' };
    }
  }, []);

  return {
    supported,
    permission,
    subscribed,
    endpoint,
    busy,
    error,
    setError,
    iosNeedsInstall,
    refresh,
    connectThisDevice,
    disconnectThisDevice,
    disconnectAllDevices,
  };
}
