import { globalApiClient } from './apiClient';

// 근무 기록 조회 (캐시 적용)
export const fetchWorkRecords = async (params = {}, skipCache = false) => {
  try {
    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    const userTypeName = authData?.state?.user?.userTypeName;
    const userKey = authData?.state?.user?.userId || authData?.state?.user?.userIdx || 'unknown';
    const cacheKey = `workRecordsCache_${userKey}_${JSON.stringify(params)}`;
    
    if (!skipCache && userTypeName !== '관리자') {
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        const cache = JSON.parse(cachedStr);
        // 10초 유효기간
        if (Date.now() - cache.timestamp < 10000) {
          return { success: true, data: cache.data };
        }
      }
    }

    const response = await globalApiClient.get('/api/work-record', {
      params: { size: 50, ...params }
    });
    
    sessionStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: response.data
    }));

    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '근무 기록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 월별 근무 기록 조회 (캐시 적용)
export const getMonthlyWorkRecords = async (year, month, skipCache = false) => {
  try {
    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    const userTypeName = authData?.state?.user?.userTypeName;
    const userKey = authData?.state?.user?.userId || authData?.state?.user?.userIdx || 'unknown';
    const cacheKey = `workRecordsMonthlyCache_${userKey}_${year}_${month}`;
    
    if (!skipCache && userTypeName !== '관리자') {
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        const cache = JSON.parse(cachedStr);
        if (Date.now() - cache.timestamp < 10000) return { success: true, data: cache.data };
      }
    }

    const response = await globalApiClient.get('/api/work-record/monthly', { params: { year, month } });
    const data = response.data?.content !== undefined ? response.data.content : response.data;
    
    sessionStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: data
    }));

    return { success: true, data: data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '월별 근무 기록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 근무 기록 등록
export const createWorkRecord = async (recordData) => {
  try {
    const response = await globalApiClient.post('/api/work-record', recordData);
    // 등록 시 캐시 무효화
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('workRecordsCache_') || key.startsWith('workRecordsMonthlyCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '근무 기록 등록에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 단일 근무 기록 조회
export const fetchWorkRecordById = async (wrIdx) => {
  try {
    const response = await globalApiClient.get(`/api/work-record/${wrIdx}`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '근무 기록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 근무 기록 수정
export const updateWorkRecord = async (wrIdx, recordData) => {
  try {
    const response = await globalApiClient.put(`/api/work-record/${wrIdx}`, recordData);
    // 수정 시 캐시 무효화
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('workRecordsCache_') || key.startsWith('workRecordsMonthlyCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '근무 기록 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 근무 기록 삭제
export const deleteWorkRecord = async (wrIdx) => {
  try {
    const response = await globalApiClient.delete(`/api/work-record/${wrIdx}`);
    // 삭제 시 캐시 무효화
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('workRecordsCache_') || key.startsWith('workRecordsMonthlyCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '근무 기록 삭제에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 근무 기록 수정 이력 조회 (Audit Log)
export const fetchWorkRecordHistory = async (params = {}) => {
  try {
    const response = await globalApiClient.get(`/api/work-record/history`, { params });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '수정 이력을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 근무 기록 삭제 복구
export const restoreWorkRecord = async (wrhIdx) => {
  try {
    const response = await globalApiClient.post(`/api/work-record/history/${wrhIdx}/restore`);
    // 복구 시 캐시 무효화
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('workRecordsCache_') || key.startsWith('workRecordsMonthlyCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '근무 기록 복구에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};


// 근무 신청 내역 조회 (캐시 적용)
export const fetchWorkRequests = async (wawDate = null, workPlaceIdx = null, skipCache = false) => {
  try {
    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    const userTypeName = authData?.state?.user?.userTypeName;
    const userKey = authData?.state?.user?.userId || authData?.state?.user?.userIdx || 'unknown';
    const cacheKey = `workRequestsCache_${userKey}_${wawDate}_${workPlaceIdx}`;
    
    if (!skipCache && userTypeName !== '관리자') {
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        const cache = JSON.parse(cachedStr);
        // 10초 유효기간
        if (Date.now() - cache.timestamp < 10000) {
          return { success: true, data: cache.data };
        }
      }
    }

    let url = `/api/work-apply-work?size=50`;
    if (wawDate) url += `&wawDate=${wawDate}`;
    if (workPlaceIdx) url += `&workPlaceIdx=${workPlaceIdx}`;
    const response = await globalApiClient.get(url);
    const data = response.data?.content !== undefined ? response.data.content : response.data;
    
    sessionStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: data
    }));

    return { success: true, data: data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '근무 신청 내역을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 월별 근무 신청 내역 조회 (캐시 적용)
export const getMonthlyWorkApplyWorks = async (year, month, skipCache = false) => {
  try {
    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    const userTypeName = authData?.state?.user?.userTypeName;
    const userKey = authData?.state?.user?.userId || authData?.state?.user?.userIdx || 'unknown';
    const cacheKey = `workRequestsMonthlyCache_${userKey}_${year}_${month}`;
    
    if (!skipCache && userTypeName !== '관리자') {
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        const cache = JSON.parse(cachedStr);
        if (Date.now() - cache.timestamp < 10000) return { success: true, data: cache.data };
      }
    }

    const response = await globalApiClient.get('/api/work-apply-work/monthly', { params: { year, month } });
    const data = response.data?.content !== undefined ? response.data.content : response.data;
    
    sessionStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: data
    }));

    return { success: true, data: data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '월별 근무 신청 내역을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 캘린더 일별 배정 인원 집계 조회
export const fetchCalendarCounts = async (year, month, workPlaceIdx = null) => {
  try {
    let url = `/api/work-apply-work/calendar?year=${year}&month=${month}`;
    if (workPlaceIdx) url += `&workPlaceIdx=${workPlaceIdx}`;
    const response = await globalApiClient.get(url);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '캘린더 집계 내역을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 일별 스케줄 조회
export const fetchDailySchedule = async (dateStr, workPlaceIdx = null) => {
  try {
    let url = `/api/work-apply-work/daily?date=${dateStr}`;
    if (workPlaceIdx) url += `&workPlaceIdx=${workPlaceIdx}`;
    const response = await globalApiClient.get(url);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '일별 스케줄을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 근무 신청 등록
export const createWorkRequest = async (requestData) => {
  try {
    const response = await globalApiClient.post('/api/work-apply-work', requestData);
    // 신청 등록 시 캐시 무효화
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('workRequestsCache_') || key.startsWith('workRequestsMonthlyCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '근무 신청에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 단일 근무 신청 조회
export const fetchWorkRequestById = async (wawIdx) => {
  try {
    const response = await globalApiClient.get(`/api/work-apply-work/${wawIdx}`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '신청 내역을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 근무 신청 수정
export const updateWorkRequest = async (wawIdx, requestData) => {
  try {
    const response = await globalApiClient.put(`/api/work-apply-work/${wawIdx}`, requestData);
    // 신청 수정 시 캐시 무효화
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('workRequestsCache_') || key.startsWith('workRequestsMonthlyCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '근무 신청 수정에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

// 근무 기록 엑셀 다운로드
export const downloadWorkRecordExcel = async (year, month, workPlaceIdx) => {
  try {
    const params = { year, month };
    if (workPlaceIdx) params.workPlaceIdx = workPlaceIdx;

    const response = await globalApiClient.get('/api/work-record/excel', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `근무기록_${year}년_${month}월.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("엑셀 다운로드 실패:", error);
    return { success: false, error: '엑셀 다운로드 중 오류가 발생했습니다.' };
  }
};
