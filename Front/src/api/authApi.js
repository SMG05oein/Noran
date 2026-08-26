import { globalApiClient as apiClient } from './apiClient';
import axios from 'axios';

const API_BASE_URL = import.meta.env.MODE === 'production' ? '' : (import.meta.env.VITE_API_URL || '');
const addUrl = '/api/user';

export const authLogin = async (userId, userPw) => {
  try {
    const response = await apiClient.post(`${addUrl}/login`, { userId, userPw });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '로그인에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const authSignup = async (userData) => {
  try {
    const response = await apiClient.post(`${addUrl}/signup`, userData);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '회원가입에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const refreshAccessToken = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}${addUrl}/refresh`, {}, { withCredentials: true });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: '토큰 갱신에 실패했습니다.' };
  }
};

export const fetchMyInfo = async (token) => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const response = await apiClient.get(`${addUrl}/me`, config);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: '내 정보를 불러오는데 실패했습니다.' };
  }
};

export const updateUserInfo = async (userIdx, updateData) => {
  try {
    const response = await apiClient.put(`${addUrl}/${userIdx}`, updateData);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '회원 정보 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const fetchAllUsers = async () => {
  try {
    const response = await apiClient.get(`${addUrl}/all`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '직원 목록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const fetchAdminWorkers = async (params = {}) => {
  try {
    const response = await apiClient.get(`${addUrl}/admin/workers`, { params });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '직원 목록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const fetchAdminManagers = async (params = {}) => {
  try {
    const response = await apiClient.get(`${addUrl}/admin/managers`, { params });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '관리자 목록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const setTempPassword = async (userIdx, tempPw) => {
  try {
    const response = await apiClient.post(`${addUrl}/${userIdx}/temp-password`, { tempPw });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '임시 비밀번호 설정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const changePassword = async (currentPw, newPw) => {
  try {
    const response = await apiClient.post(`${addUrl}/me/change-password`, { currentPw, newPw });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '비밀번호 변경에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const getMyAccountDetails = async () => {
  try {
    const response = await apiClient.get(`${addUrl}/me/account-details`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '계좌 정보를 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const getSensitiveInfo = async (userIdx) => {
  try {
    const response = await apiClient.get(`${addUrl}/${userIdx}/sensitive-info`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '민감 정보를 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const updateSensitiveInfo = async (userIdx, dto) => {
  try {
    const response = await apiClient.put(`${addUrl}/${userIdx}/sensitive-info`, dto);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '민감 정보 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const deleteUser = async (userIdx) => {
  try {
    const response = await apiClient.delete(`${addUrl}/${userIdx}`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '비활성화에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const hardDeleteUser = async (userIdx) => {
  try {
    const response = await apiClient.delete(`${addUrl}/${userIdx}/hard`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '영구 삭제에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const restoreUser = async (userIdx) => {
  try {
    const response = await apiClient.post(`${addUrl}/${userIdx}/restore`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '복구에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const fetchWorkPlaces = async () => {
  try {
    const response = await apiClient.get('/api/work-place/all');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: '근무지 목록을 불러오는데 실패했습니다.' };
  }
};

export const createWorkPlace = async (wpData) => {
  try {
    const response = await apiClient.post('/api/work-place', wpData);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '근무지 추가에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const updateWorkPlace = async (wpIdx, wpData) => {
  try {
    const response = await apiClient.put(`/api/work-place/${wpIdx}`, wpData);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '근무지 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const deleteWorkPlace = async (wpIdx) => {
  try {
    const response = await apiClient.delete(`/api/work-place/${wpIdx}`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '근무지 삭제에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 은행 정보 수정 전용 (본인만)
export const updateMyBankInfo = async (bankData) => {
  try {
    const response = await apiClient.put(`${addUrl}/me/bank-info`, bankData);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data || '은행 정보 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 직급(UserType) 목록 조회
export const fetchUserTypes = async () => {
  try {
    const response = await apiClient.get(`/api/user-types`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '직급 목록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};
export const createUserType = async (data) => {
  try {
    const response = await apiClient.post(`/api/user-types`, data);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '직급 생성에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const updateUserType = async (utIdx, data) => {
  try {
    const response = await apiClient.put(`/api/user-types/${utIdx}`, data);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '직급 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const deleteUserType = async (utIdx) => {
  try {
    const response = await apiClient.delete(`/api/user-types/${utIdx}`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '직급 삭제에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};
