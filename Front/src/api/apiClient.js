import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import useServerStateStore from '../store/useServerStateStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// 공통 Axios 인스턴스 (인증 토큰 자동 주입 및 갱신)
export const globalApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

globalApiClient.interceptors.request.use(
  (config) => {
    const state = useAuthStore.getState();
    const token = state.user?.tokens?.accessToken;
    if (token && (!config.headers || !config.headers.Authorization)) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRateLimitAlertShown = false;

globalApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      if (!isRateLimitAlertShown) {
        isRateLimitAlertShown = true;
        alert("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
        setTimeout(() => {
          isRateLimitAlertShown = false;
        }, 2000);
      }
      return Promise.reject(error);
    }

    const status = error.response?.status;
    if (!error.response || status === 502 || status === 503 || status === 504) {
      useServerStateStore.getState().setServerDown(true);
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/login')) {
      originalRequest._retry = true;
      try {
        const refreshRes = await axios.post(`${API_BASE_URL}/api/user/refresh`, {}, { withCredentials: true });
        const newAccessToken = refreshRes.data.accessToken || refreshRes.data;

        const state = useAuthStore.getState();
        if (state.user) {
          state.login({ ...state.user, tokens: { ...state.user.tokens, accessToken: newAccessToken } });
        }

        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return globalApiClient(originalRequest);
      } catch (refreshError) {
        // 서버 다운(502)이나 네트워크 에러일 때는 로그아웃시키지 않고,
        // 정확히 401(또는 403) 인증 에러일 때만 토큰 삭제 및 로그아웃 수행
        const refreshStatus = refreshError.response?.status;
        if (refreshStatus === 401 || refreshStatus === 403) {
          console.warn("인증이 만료되었습니다. 로그아웃 처리됩니다.");
          useAuthStore.getState().logout();
          window.location.href = '/login';
        } else if (!refreshError.response || refreshStatus === 502 || refreshStatus === 503 || refreshStatus === 504) {
          console.error("서버 재시작/통신 오류로 인해 토큰 갱신에 실패했습니다.");
          useServerStateStore.getState().setServerDown(true);
        } else {
          console.error("기타 서버 통신 오류로 인해 토큰 갱신에 실패했습니다.");
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
