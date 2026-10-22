import { globalApiClient } from './apiClient';
import {
  EXCEL_LIMIT_MESSAGES,
  isRequestAborted,
} from '../utils/syncApiProgress';

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
export const getMonthlyWorkRecords = async (startDate, endDate, skipCache = false) => {
  try {
    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    const userTypeName = authData?.state?.user?.userTypeName;
    const userKey = authData?.state?.user?.userId || authData?.state?.user?.userIdx || 'unknown';
    const cacheKey = `workRecordsMonthlyCache_${userKey}_${startDate}_${endDate}`;
    
    if (!skipCache && userTypeName !== '관리자') {
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        const cache = JSON.parse(cachedStr);
        if (Date.now() - cache.timestamp < 10000) return { success: true, data: cache.data };
      }
    }

    const response = await globalApiClient.get('/api/work-record/monthly', { params: { startDate, endDate } });
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
    const response = await globalApiClient.post(`/api/work-record/${wrIdx}` + '?_method=PUT', recordData);
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
    const response = await globalApiClient.post(`/api/work-record/${wrIdx}` + '?_method=DELETE');
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


// 근무 신청/배정 주간 내역 조회 (캐시 적용)
export const fetchWorkRequests = async (date = null, workPlaceIdx = null, skipCache = false) => {
  try {
    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    const userTypeName = authData?.state?.user?.userTypeName;
    const userKey = authData?.state?.user?.userId || authData?.state?.user?.userIdx || 'unknown';
    const cacheKey = `workRequestsCache_${userKey}_${date}_${workPlaceIdx}`;
    
    if (!skipCache && userTypeName !== '관리자' && workPlaceIdx == null) {
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        const cache = JSON.parse(cachedStr);
        // 10초 유효기간
        if (Date.now() - cache.timestamp < 10000) {
          return { success: true, data: cache.data };
        }
      }
    }

    let url = `/api/work-schedule/weekly`;
    const params = [];
    if (workPlaceIdx) params.push(`workPlaceIdx=${workPlaceIdx}`);
    if (date) params.push(`date=${date}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    const response = await globalApiClient.get(url);
    const data = response.data?.content !== undefined ? response.data.content : response.data;
    
    sessionStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: data
    }));

    return { success: true, data: data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '주간 배정 내역을 불러오는데 실패했습니다.';
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

    const response = await globalApiClient.get('/api/work-schedule/monthly', { params: { year, month } });
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
export const fetchCalendarCounts = async (startDate, endDate, workPlaceIdx = null) => {
  try {
    let url = `/api/work-schedule/calendar-counts?startDate=${startDate}&endDate=${endDate}`;
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
    let url = `/api/work-schedule/daily?date=${dateStr}`;
    if (workPlaceIdx) url += `&workPlaceIdx=${workPlaceIdx}`;
    const response = await globalApiClient.get(url);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || '일별 스케줄을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

const triggerXlsxDownload = (blobData, filename) => {
  const blob = new Blob([blobData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const parseResponseDataMessage = async (data) => {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed?.msg || parsed?.message || data;
    } catch {
      return data;
    }
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const text = await data.text();
      return parseResponseDataMessage(text);
    } catch {
      return null;
    }
  }
  if (typeof data === 'object') {
    return data.msg || data.message || null;
  }
  return null;
};

/** 엑셀 다운/업 공통: ErrorResponseDto.msg 우선, 413/507 하드코딩은 fallback */
const parseExcelPayloadError = async (error, { fallback, kind = 'download' } = {}) => {
  if (isRequestAborted(error)) {
    return { success: false, aborted: true, error: '요청이 취소되었습니다.', status: null };
  }

  const status = error.response?.status;
  const fromBody = await parseResponseDataMessage(error.response?.data);
  const limitFallback =
    status === 413
      ? kind === 'upload'
        ? EXCEL_LIMIT_MESSAGES.UPLOAD_413
        : EXCEL_LIMIT_MESSAGES.DOWNLOAD_413
      : status === 507
        ? EXCEL_LIMIT_MESSAGES.OOM_507
        : null;

  return {
    success: false,
    error: fromBody || limitFallback || fallback,
    status,
    data: typeof error.response?.data === 'object' && !(error.response?.data instanceof Blob)
      ? error.response.data
      : undefined,
  };
};

const mapExcelComparePhase = (data = {}) => ({
  phase: data.phase || null,
  sessionId: data.sessionId || null,
  messages: data.messages || [],
  statusCounts: data.statusCounts || null,
  totalCount: data.totalCount != null ? data.totalCount : null,
  progress: data.progress != null ? Number(data.progress) : 0,
  data,
});

const parseExcelCompareError = (error, fallback) => {
  const data = error.response?.data;
  if (data && typeof data === 'object' && data.phase) {
    return {
      success: false,
      ...mapExcelComparePhase(data),
      error: (data.messages && data.messages[0]) || data.msg || data.message || fallback,
      status: error.response?.status,
    };
  }
  // ErrorResponseDto: { status, error, msg } — BE msg 우선
  const errMsg =
    data?.msg ||
    data?.message ||
    (typeof data === 'string' ? data : null) ||
    fallback;
  return { success: false, error: errMsg, status: error.response?.status };
};

/** 근무 기록 엑셀 대조 템플릿 다운로드. options: { signal?: AbortSignal } */
export const downloadExcelCompareTemplate = async (options = {}) => {
  try {
    const response = await globalApiClient.get('/api/work-record/excel-compare/template', {
      responseType: 'blob',
      signal: options.signal,
    });
    triggerXlsxDownload(response.data, '근무기록_대조_템플릿.xlsx');
    return { success: true };
  } catch (error) {
    console.error('엑셀 대조 템플릿 다운로드 실패:', error);
    return parseExcelPayloadError(error, {
      fallback: '템플릿 다운로드 중 오류가 발생했습니다.',
      kind: 'download',
    });
  }
};

/**
 * 근무 기록 엑셀 대조 시작 (multipart).
 * phase: COLUMN_ERROR | DONE
 */
export const startExcelCompare = async (file, year, month) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await globalApiClient.post('/api/work-record/excel-compare', formData, {
      params: { year, month },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      success: true,
      ...mapExcelComparePhase(response.data || {}),
    };
  } catch (error) {
    return parseExcelCompareError(error, '엑셀 대조에 실패했습니다.');
  }
};

/** 엑셀 대조 진행 상태 폴링 */
export const getExcelCompareStatus = async (sessionId) => {
  try {
    const response = await globalApiClient.get(`/api/work-record/excel-compare/status/${sessionId}`);
    return {
      success: true,
      ...mapExcelComparePhase(response.data || {}),
    };
  } catch (error) {
    return parseExcelCompareError(error, '상태 확인에 실패했습니다.');
  }
};

/** 엑셀 대조 결과 다운로드. options: { signal?: AbortSignal } */
export const downloadExcelCompareResult = async (sessionId, year, month, options = {}) => {
  try {
    const response = await globalApiClient.get('/api/work-record/excel-compare/result', {
      params: { compareId: sessionId },
      responseType: 'blob',
      signal: options.signal,
    });
    const label = year && month ? `_${year}년_${month}월` : '';
    triggerXlsxDownload(response.data, `근무기록_대조결과${label}.xlsx`);
    return { success: true };
  } catch (error) {
    console.error('엑셀 대조 결과 다운로드 실패:', error);
    return parseExcelPayloadError(error, {
      fallback: '결과 다운로드 중 오류가 발생했습니다.',
      kind: 'download',
    });
  }
};

// 배열 구조 스케줄 등록/수정 (통합) - 관리자 전용
/**
 * assignMode: 'DRAFT' | 'PARTIAL' | 'CONFIRM'
 *   DRAFT   - 임시 저장: workers에게 미공개, 신청 셀 유지
 *   PARTIAL - 임시 배정: 출근 셀 공개(isConfirmed=true), 신청 셀은 신청으로 유지
 *   CONFIRM - 배정 확정: 출근 isConfirmed=true, 남은 신청 → 미출근
 */
export const saveWorkSchedules = async (requestDataArray, startDate, endDate, workPlaceIdx, confirmed = false, assignMode = 'CONFIRM') => {
  try {
    const response = await globalApiClient.post('/api/work-schedule/schedule', requestDataArray, {
      params: { startDate, endDate, workPlaceIdx, confirmed, assignMode }
    });
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('workRequestsCache_') || key.startsWith('workRequestsMonthlyCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '스케줄 저장에 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

const clearWorkApplyCache = () => {
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('workRequestsCache_') || key.startsWith('workRequestsMonthlyCache_')) {
      sessionStorage.removeItem(key);
    }
  });
};

// 알바생 근무 신청 생성 - POST /api/work-schedule/apply
export const saveWorkApply = async (startDate, endDate, applyDataArray) => {
  try {
    const response = await globalApiClient.post(`/api/work-schedule/apply?startDate=${startDate}&endDate=${endDate}`, applyDataArray);
    clearWorkApplyCache();
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '근무 신청에 실패했습니다.';
    return { success: false, error: errMsg, status: error.response?.status };
  }
};

// 알바생 근무 신청 수정 - PUT /api/work-schedule/apply
export const updateWorkApply = async (startDate, endDate, applyDataArray) => {
  try {
    const response = await globalApiClient.post(`/api/work-schedule/apply?startDate=${startDate}&endDate=${endDate}&_method=PUT`, applyDataArray);
    clearWorkApplyCache();
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.msg || (typeof error.response?.data === 'string' ? error.response.data : null) || '근무 신청 수정에 실패했습니다.';
    return { success: false, error: errMsg, status: error.response?.status };
  }
};

// 근무 기록 엑셀 다운로드
// options: { signal?: AbortSignal }
export const downloadWorkRecordExcel = async (year, month, workPlaceIdx, options = {}) => {
  try {
    const params = { year, month };
    if (workPlaceIdx) params.workPlaceIdx = workPlaceIdx;

    const response = await globalApiClient.get('/api/work-record/excel', {
      params,
      responseType: 'blob',
      signal: options.signal,
    });

    // 일부 서버가 에러를 200+JSON blob으로 주는 경우 방어
    const contentType = response.headers?.['content-type'] || '';
    if (contentType.includes('application/json')) {
      const text = await response.data.text();
      let msg = '엑셀 다운로드 중 오류가 발생했습니다.';
      try {
        const json = JSON.parse(text);
        msg = json.msg || json.message || msg;
      } catch {
        /* ignore */
      }
      return { success: false, error: msg };
    }

    triggerXlsxDownload(response.data, `근무기록_${year}년_${month}월.xlsx`);
    return { success: true };
  } catch (error) {
    console.error('엑셀 다운로드 실패:', error);
    return parseExcelPayloadError(error, {
      fallback: '엑셀 다운로드 중 오류가 발생했습니다.',
      kind: 'download',
    });
  }
};

// 관리자 근무기록 엑셀 인원 및 근무지 사전 검증
// options: { signal?: AbortSignal }
export const validateExcelWorkRecords = async (payload, options = {}) => {
  try {
    // payload: { userNames: string[], workPlaceNames: string[], records: Array }
    const response = await globalApiClient.post('/api/work-record/admin/excel-validate', payload, {
      signal: options.signal,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return parseExcelPayloadError(error, {
      fallback: '엑셀 데이터 검증 중 오류가 발생했습니다.',
      kind: 'upload',
    });
  }
};

// 관리자 근무기록 엑셀 최종 일괄 등록
// options: { signal?: AbortSignal }
export const uploadExcelWorkRecords = async (payload, options = {}) => {
  try {
    // payload: { overwriteExisting: boolean, records: Array }
    const response = await globalApiClient.post('/api/work-record/admin/excel-upload', payload, {
      signal: options.signal,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return parseExcelPayloadError(error, {
      fallback: '근무기록 엑셀 업로드 등록에 실패했습니다.',
      kind: 'upload',
    });
  }
};

// 특정 년/월의 기한 지난 미작성 알바생 목록 조회 (관리자 전용)
export const fetchUnrecordedWorkList = async ({ year, month, workPlaceIdx }) => {
  try {
    const params = { year, month };
    if (workPlaceIdx) params.workPlaceIdx = workPlaceIdx;

    try {
      const response = await globalApiClient.get('/api/work-records/unrecorded', { params });
      return { success: true, data: Array.isArray(response.data) ? response.data : [] };
    } catch (err) {
      if (err.response?.status === 404) {
        const fallbackRes = await globalApiClient.get('/api/work-record/unrecorded', { params });
        return { success: true, data: Array.isArray(fallbackRes.data) ? fallbackRes.data : [] };
      }
      throw err;
    }
  } catch (error) {
    const errMsg =
      error.response?.data?.msg ||
      error.response?.data?.message ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      '미작성 알바생 목록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg, data: [] };
  }
};


