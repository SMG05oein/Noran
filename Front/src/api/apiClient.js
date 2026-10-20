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
    config.headers = config.headers || {};
    const hasAuthHeader = config.headers.Authorization || (config.headers.get && config.headers.get('Authorization'));
    if (token && !hasAuthHeader) {
      if (config.headers.set) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRateLimitAlertShown = false;
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 서버 재기동/일시 통신 장애 시 백오프를 적용하여 토큰 갱신 재시도
const requestRefreshTokenWithRetry = async (retries = 2, delayMs = 1000) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.post(`${API_BASE_URL}/api/user/refresh`, {}, { withCredentials: true });
    } catch (err) {
      const status = err.response?.status;
      // 401이나 403이면 리프레시 토큰 자체가 만료/위조된 것이므로 즉시 에러 발생 (재시도 불필요)
      if (status === 401 || status === 403) {
        throw err;
      }
      // 마지막 시도면 에러 throw
      if (attempt === retries) {
        throw err;
      }
      // 네트워크 에러나 5xx 일시적 장애인 경우 잠시 대기 후 재시도
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
};

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

    const originalRequest = error.config;
    const status = error.response?.status;
    const isNetworkOr5xx = !error.response || (status >= 500 && status <= 504);

    // 일시적 네트워크 장애 또는 5xx 서버 재부팅 처리 (로그아웃 절대 안 함)
    if (isNetworkOr5xx) {
      if (originalRequest && !originalRequest._networkRetry && (originalRequest.method || 'get').toLowerCase() === 'get') {
        originalRequest._networkRetry = true;
        await new Promise((resolve) => setTimeout(resolve, 800));
        return globalApiClient(originalRequest);
      }
      useServerStateStore.getState().setServerDown(true);
      return Promise.reject(error);
    }

    // 401 Unauthorized 발생 시 리프레시 토큰으로 액세스 토큰 재발급 (동시성 제어 적용)
    if (status === 401 && originalRequest && !originalRequest.url?.includes('/login')) {
      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      // 이미 토큰 갱신 중인 경우 큐에 넣어 대기 후 일괄 재시도
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest._retry = true;
            originalRequest.headers = originalRequest.headers || {};
            if (originalRequest.headers.set) {
              originalRequest.headers.set('Authorization', `Bearer ${token}`);
            } else {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return globalApiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await requestRefreshTokenWithRetry(2, 1000);
        const newAccessToken = refreshRes.data?.accessToken || refreshRes.data;

        if (!newAccessToken) {
          throw new Error('새 액세스 토큰을 수신하지 못했습니다.');
        }

        const state = useAuthStore.getState();
        if (state.user) {
          state.login({ ...state.user, tokens: { ...state.user.tokens, accessToken: newAccessToken } });
        }

        processQueue(null, newAccessToken);

        originalRequest.headers = originalRequest.headers || {};
        if (originalRequest.headers.set) {
          originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
        } else {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return globalApiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        const refreshStatus = refreshError.response?.status;
        // 오직 리프레시 요청의 응답이 명확하게 401 또는 403일 때만 최종 로그아웃 및 로그인 이동
        if (refreshStatus === 401 || refreshStatus === 403) {
          console.warn("리프레시 토큰이 만료되어 로그아웃 처리됩니다.");
          useAuthStore.getState().logout();
          window.location.href = '/login';
        } else if (!refreshError.response || (refreshStatus >= 500 && refreshStatus <= 504)) {
          // 서버 재시작 중이거나 일시적 네트워크 통신 오류인 경우 로그아웃 차단 및 서버 다운 상태 표시
          console.error("서버 재시작 또는 일시적 통신 오류로 인해 토큰 갱신에 실패했습니다.");
          useServerStateStore.getState().setServerDown(true);
        } else {
          console.error("기타 서버 통신 오류로 인해 토큰 갱신에 실패했습니다.", refreshError);
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

