import axios from 'axios';
import useDevAuthStore from '../store/useDevAuthStore';
import {
  DEV_IP_OTP_HEADER,
  getDevIpToken,
  waitForDevIpOtp,
  isDevIpOtpRequiredError,
} from './devIpToken';

const API_BASE_URL = import.meta.env.MODE === 'production' ? '' : (import.meta.env.VITE_API_URL || '');

export const devApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const isIpOtpAuthUrl = (url = '') => String(url).includes('/auth/ip-otp/');

devApiClient.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};
    const state = useDevAuthStore.getState();
    const token = state.devUser?.tokens?.accessToken;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const ipToken = getDevIpToken();
    if (ipToken && !config.headers[DEV_IP_OTP_HEADER]) {
      config.headers[DEV_IP_OTP_HEADER] = ipToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

devApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (
      config &&
      !config.__ipOtpRetried &&
      !isIpOtpAuthUrl(config.url) &&
      isDevIpOtpRequiredError(error)
    ) {
      try {
        await waitForDevIpOtp();
        config.__ipOtpRetried = true;
        return devApiClient(config);
      } catch {
        return Promise.reject(error);
      }
    }

    if (
      error.response?.status === 401 &&
      config?.url &&
      !String(config.url).includes('/login') &&
      !isIpOtpAuthUrl(config.url)
    ) {
      useDevAuthStore.getState().devLogout();
      window.location.href = '/dev/login';
    }
    return Promise.reject(error);
  }
);
