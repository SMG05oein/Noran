import { globalApiClient as apiClient } from './apiClient';

const BASE = '/api/alarms';

const errMsg = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.msg ||
  (typeof error.response?.data === 'string' ? error.response.data : null) ||
  fallback;

export const fetchVapidPublicKey = async () => {
  try {
    const response = await apiClient.get(`${BASE}/vapid-public-key`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: errMsg(error, 'VAPID 공개키를 불러오지 못했습니다.'), status: error.response?.status };
  }
};

export const fetchAlarmPreferences = async () => {
  try {
    const response = await apiClient.get(`${BASE}/preferences`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: errMsg(error, '알람 설정을 불러오지 못했습니다.'), status: error.response?.status };
  }
};

export const updateAlarmPreferences = async (payload) => {
  try {
    const response = await apiClient.put(`${BASE}/preferences`, payload);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: errMsg(error, '알람 설정 저장에 실패했습니다.'), status: error.response?.status };
  }
};

/** PushSubscription.toJSON() 형태 { endpoint, keys: { p256dh, auth } } */
export const savePushSubscription = async (subscriptionJson) => {
  try {
    const response = await apiClient.post(`${BASE}/subscriptions`, {
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys?.p256dh,
        auth: subscriptionJson.keys?.auth,
      },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: errMsg(error, '이 기기 알람 연결에 실패했습니다.'), status: error.response?.status };
  }
};

/** 현재 기기만 해제 — body { endpoint } */
export const deletePushSubscription = async (endpoint) => {
  try {
    const response = await apiClient.delete(`${BASE}/subscriptions`, {
      data: { endpoint },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: errMsg(error, '이 기기 알람 해제에 실패했습니다.'), status: error.response?.status };
  }
};

/** 계정 전체 구독 삭제 (알람 전체 OFF) */
export const deleteAllPushSubscriptions = async () => {
  try {
    const response = await apiClient.delete(`${BASE}/subscriptions/all`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: errMsg(error, '전체 구독 해제에 실패했습니다.'), status: error.response?.status };
  }
};

/** 개발/검증용: 로그인 사용자 구독으로 테스트 푸시 1회 발송 */
export const sendTestAlarm = async () => {
  try {
    const response = await apiClient.post(`${BASE}/test`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: errMsg(error, '테스트 알람 발송에 실패했습니다.'), status: error.response?.status };
  }
};
