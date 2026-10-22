import axios from 'axios';
import useDevAuthStore from '../store/useDevAuthStore';
import {
  DEV_IP_OTP_HEADER,
  getDevIpToken,
  waitForDevIpOtp,
  isDevIpOtpRequiredError,
} from './devIpToken';
import { applyClientPageHeader } from './clientPageHeader';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
      if (typeof config.headers.set === 'function') {
        config.headers.set(DEV_IP_OTP_HEADER, ipToken);
      } else {
        config.headers[DEV_IP_OTP_HEADER] = ipToken;
      }
    }
    applyClientPageHeader(config.headers);
    return config;
  },
  (error) => Promise.reject(error)
);

let isDevRateLimitAlertShown = false;

devApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      if (!isDevRateLimitAlertShown) {
        isDevRateLimitAlertShown = true;
        alert("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
        setTimeout(() => {
          isDevRateLimitAlertShown = false;
        }, 2000);
      }
      return Promise.reject(error);
    }

    const config = error.config;
    if (
      config &&
      !config.__ipOtpRetried &&
      !isIpOtpAuthUrl(config.url) &&
      isDevIpOtpRequiredError(error)
    ) {
      try {
        const ipToken = await waitForDevIpOtp();
        config.__ipOtpRetried = true;
        config.headers = config.headers || {};
        const nextIp = ipToken || getDevIpToken();
        if (typeof config.headers.set === 'function') {
          config.headers.set(DEV_IP_OTP_HEADER, nextIp);
        } else {
          config.headers[DEV_IP_OTP_HEADER] = nextIp;
        }
        // OTP 모달 후 재시도 — 현재 페이지(대시보드 등) URL 다시 주입
        applyClientPageHeader(config.headers);
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
