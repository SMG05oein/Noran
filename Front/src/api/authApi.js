import { globalApiClient as apiClient } from './apiClient';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const addUrl = '/api/user';

export const authLogin = async (userId, userPw) => {
  try {
    const response = await apiClient.post(`${addUrl}/login`, { userId, userPw });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg =
      error.response?.data?.message ||
      error.response?.data?.msg ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      '로그인에 실패했습니다.';
    return { success: false, error: errMsg, status: error.response?.status };
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
    return { success: false, error: '내 정보를 불러오는데 실패했습니다.', status: error.response?.status };
  }
};

export const updateUserInfo = async (userIdx, updateData) => {
  try {
    const response = await apiClient.post(`${addUrl}/${userIdx}` + '?_method=PUT', updateData);
    // 캐시 무효화
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('adminWorkersCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '회원 정보 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const fetchAllUsers = async (params = {}) => {
  try {
    const response = await apiClient.get(`${addUrl}/admin/all`, { params });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '직원 목록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const fetchAdminWorkers = async (params = {}, skipCache = false) => {
  try {
    const cacheKey = `adminWorkersCache_${JSON.stringify(params)}`;
    if (!skipCache) {
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        const cache = JSON.parse(cachedStr);
        // 10분(600,000ms) 유효기간
        if (Date.now() - cache.timestamp < 600000) {
          return { success: true, data: cache.data };
        }
      }
    }

    const response = await apiClient.get(`${addUrl}/admin/workers`, { params });
    sessionStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: response.data
    }));

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
    const response = await apiClient.post(`${addUrl}/${userIdx}/sensitive-info` + '?_method=PUT', dto);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '민감 정보 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};


export const bulkUpdateUsers = async (dto) => {
  try {
    const response = await apiClient.post(`${addUrl}/bulk-update` + '?_method=PUT', dto);
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('adminWorkersCache_') || key === 'allUsersCache') {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '일괄 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const deleteUser = async (userIdx) => {
  try {
    const response = await apiClient.post(`${addUrl}/${userIdx}` + '?_method=DELETE');
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('adminWorkersCache_') || key === 'allUsersCache') {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '비활성화에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const leaveUser = async (userIdx) => {
  try {
    const response = await apiClient.post(`${addUrl}/${userIdx}/leave?_method=PUT`);
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('adminWorkersCache_') || key === 'allUsersCache') {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '비활성화에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const withdrawUser = async () => {
  try {
    const response = await apiClient.post(`${addUrl}/me/withdraw` + '?_method=DELETE');
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '회원 탈퇴에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const hardDeleteUser = async (userIdx) => {
  try {
    const response = await apiClient.post(`${addUrl}/${userIdx}/hard` + '?_method=DELETE');
    // 캐시 무효화
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('adminWorkersCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '영구 삭제에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const restoreUser = async (userIdx) => {
  try {
    const response = await apiClient.post(`${addUrl}/${userIdx}/restore`);
    // 캐시 무효화
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('adminWorkersCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: '사용자 복구에 실패했습니다.' };
  }
};

export const fetchWorkPlaces = async (skipCache = false) => {
  try {
    const cacheKey = 'workPlacesAllCache';
    if (!skipCache) {
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        const cache = JSON.parse(cachedStr);
        // 10분(600,000ms) 유효기간
        if (Date.now() - cache.timestamp < 600000) {
          return { success: true, data: cache.data };
        }
      }
    }

    const response = await apiClient.get('/api/work-place/all');
    sessionStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: response.data
    }));

    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: '근무지 목록을 불러오는데 실패했습니다.' };
  }
};

export const createWorkPlace = async (wpData) => {
  try {
    const response = await apiClient.post('/api/work-place', wpData);
    // 근무지 캐시 무효화
    sessionStorage.removeItem('workPlacesAllCache');
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '근무지 추가에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const updateWorkPlace = async (wpIdx, wpData) => {
  try {
    const response = await apiClient.post(`/api/work-place/${wpIdx}` + '?_method=PUT', wpData);
    // 근무지 캐시 무효화
    sessionStorage.removeItem('workPlacesAllCache');
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '근무지 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const deleteWorkPlace = async (wpIdx) => {
  try {
    const response = await apiClient.post(`/api/work-place/${wpIdx}` + '?_method=DELETE');
    // 근무지 캐시 무효화
    sessionStorage.removeItem('workPlacesAllCache');
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '근무지 삭제에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 은행 코드 목록
export const fetchBanks = async () => {
  try {
    const response = await apiClient.get('/api/banks');
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '은행 목록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 은행 정보 수정 전용 (본인만) — payload: { bankCode, userAccountName, ... }
export const updateMyBankInfo = async (bankData) => {
  try {
    const response = await apiClient.post(`${addUrl}/me/bank-info` + '?_method=PUT', bankData);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data || '은행 정보 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 직원 엑셀 다운로드 (지점별 Sheet)
export const downloadUserExcel = async (workPlaceIdx = null) => {
  try {
    const params = {};
    if (workPlaceIdx) params.workPlaceIdx = workPlaceIdx;
    const response = await apiClient.get(`${addUrl}/admin/excel`, {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `직원목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '직원 엑셀 다운로드에 실패했습니다.';
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
    const response = await apiClient.post(`/api/user-types/${utIdx}` + '?_method=PUT', data);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '직급 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const createAdminUser = async (userData) => {
  try {
    const response = await apiClient.post(`${addUrl}/admin/register`, userData);
    // 캐시 무효화
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('adminWorkersCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '직원 등록에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const deleteUserType = async (utIdx) => {
  try {
    const response = await apiClient.post(`/api/user-types/${utIdx}` + '?_method=DELETE');
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '직급 삭제에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

export const fetchArchivedWorkers = async (params = {}, reason) => {
  try {
    const config = { params: { ...params, reason } };
    const response = await apiClient.get(`${addUrl}/admin/archived-workers`, config);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '아카이빙 데이터를 불러오는데 실패했습니다.';
    return { success: false, error: errMsg, status: error.response?.status };
  }
};

export const restoreArchivedUser = async (userIdx) => {
  try {
    const response = await apiClient.post(`${addUrl}/admin/archived-workers/${userIdx}/restore`);
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('adminWorkersCache_')) sessionStorage.removeItem(key);
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '복구에 실패했습니다.';
    return { success: false, error: errMsg, status: error.response?.status };
  }
};

export const deleteArchivedUser = async (userIdx) => {
  try {
    const response = await apiClient.post(`${addUrl}/admin/archived-workers/${userIdx}` + '?_method=DELETE');
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('adminWorkersCache_')) sessionStorage.removeItem(key);
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '영구 삭제에 실패했습니다.';
    return { success: false, error: errMsg, status: error.response?.status };
  }
};

