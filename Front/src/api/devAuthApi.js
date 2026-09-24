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

export const fetchDeployInfo = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/dashboard/deploy-info`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '배포 정보를 불러오는데 실패했습니다.') };
  }
};

export const fetchDashboardAudit = async (limit = 50) => {
  try {
    const response = await devApiClient.get(`${addUrl}/dashboard/audit`, { params: { limit } });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '대시보드 감사 로그를 불러오는데 실패했습니다.') };
  }
};

export const postDashboardAction = async (action, id, pw) => {
  try {
    const response = await devApiClient.post(`${addUrl}/dashboard/${action}`, { id, pw });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, `${action} 요청에 실패했습니다.`) };
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

export const fetchDatabaseSchema = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/database/schema`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, 'DB 스키마를 불러오는데 실패했습니다.') };
  }
};

export const fetchDatabaseAudit = async (limit = 50) => {
  try {
    const response = await devApiClient.get(`${addUrl}/database/audit`, { params: { limit } });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, 'DB 감사 로그를 불러오는데 실패했습니다.') };
  }
};

export const executeDbQuery = async (id, pw, sql, { readOnly = true, confirmDangerous = false } = {}) => {
  try {
    const response = await devApiClient.post(`${addUrl}/database/query`, {
      id,
      pw,
      sql,
      readOnly,
      confirmDangerous,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '쿼리 실행 중 오류가 발생했습니다.') };
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
    const response = await devApiClient.put(`${addUrl}/announcements/${id}`, payload);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '공지사항 수정에 실패했습니다.') };
  }
};

export const toggleAnnouncement = async (id) => {
  try {
    const response = await devApiClient.put(`${addUrl}/announcements/${id}/toggle`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '공지사항 상태 변경에 실패했습니다.') };
  }
};

export const deleteAnnouncement = async (id) => {
  try {
    const response = await devApiClient.delete(`${addUrl}/announcements/${id}`);
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

export const sendAlertTest = async (id, pw) => {
  try {
    const response = await devApiClient.post(`${addUrl}/alerts/test`, { id, pw });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, '테스트 알림 전송에 실패했습니다.') };
  }
};

export const fetchNetlifyStatus = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/netlify/status`);
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 503 && error.response?.data) {
      return { success: true, data: error.response.data };
    }
    return { success: false, error: extractError(error, 'Netlify 상태를 불러오는데 실패했습니다.') };
  }
};

export const fetchNetlifyDeploys = async (perPage = 15) => {
  try {
    const response = await devApiClient.get(`${addUrl}/netlify/deploys`, { params: { perPage } });
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 503 && error.response?.data) {
      return { success: true, data: error.response.data };
    }
    return { success: false, error: extractError(error, 'Netlify 배포 목록을 불러오는데 실패했습니다.') };
  }
};

export const triggerNetlifyDeploy = async (id, pw, clearCache = false) => {
  try {
    const response = await devApiClient.post(`${addUrl}/netlify/deploy`, { id, pw, clearCache });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, 'Netlify 배포 트리거에 실패했습니다.') };
  }
};

export const rollbackNetlifyDeploy = async (id, pw, deployId) => {
  try {
    const response = await devApiClient.post(`${addUrl}/netlify/rollback`, { id, pw, deployId });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: extractError(error, 'Netlify 롤백에 실패했습니다.') };
  }
};
