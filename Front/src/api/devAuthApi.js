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
