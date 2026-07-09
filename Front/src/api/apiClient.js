import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

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

globalApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
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
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
