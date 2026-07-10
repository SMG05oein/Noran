import axios from 'axios';
import useDevAuthStore from '../store/useDevAuthStore';

const API_BASE_URL = import.meta.env.MODE === 'production' ? '' : (import.meta.env.VITE_API_URL || '');

export const devApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

devApiClient.interceptors.request.use(
  (config) => {
    const state = useDevAuthStore.getState();
    const token = state.devUser?.tokens?.accessToken;
    if (token && (!config.headers || !config.headers.Authorization)) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

devApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/login')) {
      useDevAuthStore.getState().devLogout();
      window.location.href = '/dev/login';
    }
    return Promise.reject(error);
  }
);
