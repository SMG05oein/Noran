import { devApiClient } from './devApiClient';
import { setDevIpToken } from './devIpToken';

const addUrl = '/api/dev';

const extractError = (error, fallback) => {
  const data = error.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  return data.message || data.error || fallback;
};

export const requestDevIpOtp = async () => {
  try {
    const response = await devApiClient.post(`${addUrl}/auth/ip-otp/request`, {});
    return { success: true, data: response.data };
  } catch (error) {
    const status = error.response?.status;
    return {
      success: false,
      error: extractError(error, '인증번호 발송에 실패했습니다.'),
      status,
      retryAfter: error.response?.headers?.['retry-after'],
    };
  }
};

export const verifyDevIpOtp = async (code) => {
  try {
    const response = await devApiClient.post(`${addUrl}/auth/ip-otp/verify`, { code });
    const ipToken = response.data?.ipToken;
    if (ipToken) setDevIpToken(ipToken);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '인증번호 확인에 실패했습니다.') };
  }
};

export const devLogin = async (devId, devPw) => {
  try {
    const response = await devApiClient.post(`${addUrl}/auth/login`, { devId, devPw });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: extractError(error, '개발자 로그인에 실패했습니다.'),
      code: error.response?.data?.code,
      status: error.response?.status,
    };
  }
};

export const fetchSystemInfo = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/dashboard/system-info`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '시스템 정보를 불러오는데 실패했습니다.') };
  }
};

export const changeDevPassword = async (oldPw, newPw) => {
  try {
    const response = await devApiClient.post(`${addUrl}/auth/change-password`, { oldPw, newPw });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '비밀번호 변경에 실패했습니다.') };
  }
};

export const fetchDevLogs = async (lines = 200, { level = '', keyword = '' } = {}) => {
  try {
    const params = { lines };
    if (level) params.level = level;
    if (keyword) params.keyword = keyword;
    const response = await devApiClient.get(`${addUrl}/logs`, { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '로그를 불러오는데 실패했습니다.') };
  }
};

// 허용 IP 관리 (403 IP OTP는 devApiClient 인터셉터가 처리)
export const fetchAllowedIps = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/ips`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, status: error.response?.status, error: extractError(error, 'IP 목록을 불러오는데 실패했습니다.') };
  }
};

export const addAllowedIp = async ({ type, ip, memo }) => {
  try {
    const payload = { type, ip };
    if (memo) payload.memo = memo;
    const response = await devApiClient.post(`${addUrl}/ips`, payload);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, status: error.response?.status, error: extractError(error, 'IP 등록에 실패했습니다.') };
  }
};

export const deleteAllowedIp = async (id) => {
  try {
    const response = await devApiClient.delete(`${addUrl}/ips/${id}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, status: error.response?.status, error: extractError(error, 'IP 삭제에 실패했습니다.') };
  }
};

// 로그 레벨 임시 변경 (403 IP OTP는 devApiClient 인터셉터가 처리)
export const fetchLogLevels = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/logs/level`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, status: error.response?.status, error: extractError(error, '로그 레벨 정보를 불러오는데 실패했습니다.') };
  }
};

export const changeLogLevel = async (logger, level, minutes) => {
  try {
    const response = await devApiClient.post(`${addUrl}/logs/level`, { logger, level, minutes });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, status: error.response?.status, error: extractError(error, '로그 레벨 변경에 실패했습니다.') };
  }
};

export const resetLogLevels = async () => {
  try {
    const response = await devApiClient.post(`${addUrl}/logs/level/reset`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, status: error.response?.status, error: extractError(error, '로그 레벨 복구에 실패했습니다.') };
  }
};

export const downloadDevLogs = async (lines = 2000, { level = '', keyword = '' } = {}) => {
  try {
    const params = { lines };
    if (level) params.level = level;
    if (keyword) params.keyword = keyword;
    const response = await devApiClient.get(`${addUrl}/logs/download`, {
      params,
      responseType: 'blob',
    });
    return { success: true, data: response.data };
  } catch (error) {
    let message = '로그 다운로드에 실패했습니다.';
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const parsed = JSON.parse(text);
        message = parsed.message || parsed.error || message;
      } catch {
        /* keep fallback */
      }
    } else {
      message = extractError(error, message);
    }
    return { success: false, error: message };
  }
};

export const fetchApiAnalytics = async ({ hours, limit = 10 } = {}) => {
  try {
    const params = { limit };
    if (hours != null) params.hours = hours;
    const response = await devApiClient.get(`${addUrl}/analytics/top-endpoints`, { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, 'API 통계 데이터를 불러오는데 실패했습니다.') };
  }
};

export const fetchSlowEndpoints = async ({ hours = 24, limit = 10 } = {}) => {
  try {
    const response = await devApiClient.get(`${addUrl}/analytics/slow-endpoints`, {
      params: { hours, limit },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '느린 엔드포인트 통계를 불러오는데 실패했습니다.') };
  }
};

export const fetchStatusBreakdown = async (hours = 24) => {
  try {
    const response = await devApiClient.get(`${addUrl}/analytics/status-breakdown`, {
      params: { hours },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '상태코드 통계를 불러오는데 실패했습니다.') };
  }
};

export const fetchHourlyTrend = async (hours = 24) => {
  try {
    const response = await devApiClient.get(`${addUrl}/analytics/hourly-trend`, {
      params: { hours },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '시간대별 추이를 불러오는데 실패했습니다.') };
  }
};

export const fetchAnnouncements = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/announcements`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '공지사항 목록을 불러오는데 실패했습니다.') };
  }
};

export const createAnnouncement = async (title, content, isActive, startDate, endDate) => {
  try {
    const payload = { title, content, isActive };
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;
    const response = await devApiClient.post(`${addUrl}/announcements`, payload);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '공지사항 등록에 실패했습니다.') };
  }
};

export const updateAnnouncement = async (id, title, content, isActive, startDate, endDate) => {
  try {
    const payload = { title, content, isActive };
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;
    const response = await devApiClient.post(`${addUrl}/announcements/${id}` + '?_method=PUT', payload);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '공지사항 수정에 실패했습니다.') };
  }
};

export const toggleAnnouncement = async (id) => {
  try {
    const response = await devApiClient.post(`${addUrl}/announcements/${id}/toggle?_method=PUT`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '공지사항 상태 변경에 실패했습니다.') };
  }
};

export const deleteAnnouncement = async (id) => {
  try {
    const response = await devApiClient.post(`${addUrl}/announcements/${id}` + '?_method=DELETE');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '공지사항 삭제에 실패했습니다.') };
  }
};

export const toggleMaintenanceMode = async (enabled, { message, scheduledStart, scheduledEnd } = {}) => {
  try {
    const payload = { enabled };
    if (message != null) payload.message = message;
    if (scheduledStart) payload.scheduledStart = scheduledStart;
    if (scheduledEnd) payload.scheduledEnd = scheduledEnd;
    const response = await devApiClient.post(`${addUrl}/announcements/maintenance`, payload);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '점검 모드 설정 변경에 실패했습니다.') };
  }
};

export const fetchAlertConfig = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/alerts/config`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '알림 설정을 불러오는데 실패했습니다.') };
  }
};

export const sendAlertTest = async () => {
  try {
    const response = await devApiClient.post(`${addUrl}/alerts/test`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '테스트 알림 전송에 실패했습니다.') };
  }
};

export const fetchTestServerStatus = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/dashboard/test-server`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '테스트 서버 상태를 불러오지 못했습니다.') };
  }
};

export const startTestServer = async (id, pw) => {
  try {
    const response = await devApiClient.post(`${addUrl}/dashboard/test-server/start`, { id, pw });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '테스트 서버 실행에 실패했습니다.') };
  }
};

export const stopTestServer = async (id, pw) => {
  try {
    const response = await devApiClient.post(`${addUrl}/dashboard/test-server/stop`, { id, pw });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '테스트 서버 중지에 실패했습니다.') };
  }
};

export const restartTestServer = async (id, pw) => {
  try {
    const response = await devApiClient.post(`${addUrl}/dashboard/test-server/restart`, { id, pw });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '테스트 서버 재실행에 실패했습니다.') };
  }
};

export const deployTestServer = async (id, pw) => {
  try {
    const response = await devApiClient.post(`${addUrl}/dashboard/test-server/deploy`, { id, pw });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '테스트 서버 재기동에 실패했습니다.') };
  }
};

