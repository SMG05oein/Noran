import { devApiClient } from './devApiClient';

const API_BASE_URL = import.meta.env.MODE === 'production' ? '' : (import.meta.env.VITE_API_URL || '');
const addUrl = '/api/dev';

export const devLogin = async (devId, devPw) => {
  try {
    const response = await devApiClient.post(`${addUrl}/auth/login`, { devId, devPw });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : null) || '개발자 로그인에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const fetchSystemInfo = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/dashboard/system-info`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || '시스템 정보를 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const changeDevPassword = async (oldPw, newPw) => {
  try {
    const response = await devApiClient.post(`${addUrl}/auth/change-password`, { oldPw, newPw });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : null) || '비밀번호 변경에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const fetchDatabaseSchema = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/database/schema`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || 'DB 스키마를 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const executeDbQuery = async (id, pw, sql) => {
  try {
    const response = await devApiClient.post(`${addUrl}/database/query`, { id, pw, sql });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || '쿼리 실행 중 오류가 발생했습니다.';
    return { success: false, error: errMsg };
  }
};

// 1. 실시간 로그 파일 조회 API
export const fetchDevLogs = async (lines = 200) => {
  try {
    const response = await devApiClient.get(`${addUrl}/logs`, { params: { lines } });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || '로그를 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 2. API 호출 통계 Top 10 API
export const fetchApiAnalytics = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/analytics/top-endpoints`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || 'API 통계 데이터를 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 3. 공지사항 및 점검 모드 관리 API
export const fetchAnnouncements = async () => {
  try {
    const response = await devApiClient.get(`${addUrl}/announcements`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || '공지사항 목록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const createAnnouncement = async (title, content, isActive) => {
  try {
    const response = await devApiClient.post(`${addUrl}/announcements`, { title, content, isActive });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || '공지사항 등록에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const toggleAnnouncement = async (id) => {
  try {
    const response = await devApiClient.put(`${addUrl}/announcements/${id}/toggle`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || '공지사항 상태 변경에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const deleteAnnouncement = async (id) => {
  try {
    const response = await devApiClient.delete(`${addUrl}/announcements/${id}`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || '공지사항 삭제에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const toggleMaintenanceMode = async (enabled) => {
  try {
    const response = await devApiClient.post(`${addUrl}/announcements/maintenance`, { enabled });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.message || '점검 모드 설정 변경에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};
