/** Dev IP OTP token storage + UI wait bridge (localStorage key: devIpToken) */

export const DEV_IP_TOKEN_KEY = 'devIpToken';
export const DEV_IP_OTP_HEADER = 'X-Dev-Ip-Token';

export const getDevIpToken = () => {
  try {
    return localStorage.getItem(DEV_IP_TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

export const setDevIpToken = (token) => {
  try {
    if (token) localStorage.setItem(DEV_IP_TOKEN_KEY, token);
    else localStorage.removeItem(DEV_IP_TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

export const clearDevIpToken = () => setDevIpToken('');

const listeners = new Set();
let pendingPromise = null;
let pendingResolve = null;
let pendingReject = null;

/** Subscribe to OTP-required events (UI mounts modal). */
export const subscribeDevIpOtpRequired = (handler) => {
  listeners.add(handler);
  return () => listeners.delete(handler);
};

/**
 * Called by axios interceptor when DEV_IP_OTP_REQUIRED.
 * Resolves after user verifies OTP (token saved). Rejects if cancelled.
 */
export const waitForDevIpOtp = () => {
  if (pendingPromise) return pendingPromise;

  pendingPromise = new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    notifyListeners();
  }).finally(() => {
    pendingPromise = null;
    pendingResolve = null;
    pendingReject = null;
  });

  return pendingPromise;
};

/** Open OTP UI manually (e.g. login page button). Completes when verified. */
export const promptDevIpOtp = () => waitForDevIpOtp();

const notifyListeners = () => {
  listeners.forEach((h) => {
    try {
      h();
    } catch {
      /* ignore */
    }
  });
};

export const completeDevIpOtp = (token) => {
  if (token) setDevIpToken(token);
  if (pendingResolve) pendingResolve(token || getDevIpToken());
};

export const cancelDevIpOtp = (reason = 'cancelled') => {
  if (pendingReject) pendingReject(new Error(reason));
};

export const isDevIpOtpRequiredError = (error) => {
  const status = error?.response?.status;
  if (status !== 403) return false;
  let data = error?.response?.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return data.includes('DEV_IP_OTP_REQUIRED');
    }
  }
  return data?.code === 'DEV_IP_OTP_REQUIRED';
};
