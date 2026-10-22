import { globalApiClient } from './apiClient';
import { extractAxiosErrorMessage } from '../utils/syncApiProgress';

/** 급여 목록 조회 (Spring Page) */
export const fetchPayrollList = async (params = {}) => {
  try {
    const response = await globalApiClient.get('/api/payroll', { params });
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg =
      error.response?.data?.msg ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      '급여 목록을 불러오는데 실패했습니다.';
    return { success: false, error: errMsg };
  }
};

/** 급여 엑셀 다운로드. options: { signal?: AbortSignal } */
export const downloadPayrollExcel = async (year, month, workPlaceIdx, options = {}) => {
  try {
    const params = { year, month };
    if (workPlaceIdx) params.workPlaceIdx = workPlaceIdx;

    const response = await globalApiClient.get('/api/payroll/excel', {
      params,
      responseType: 'blob',
      signal: options.signal,
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `급여_${year}년_${month}월.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('급여 엑셀 다운로드 실패:', error);
    const parsed = await extractAxiosErrorMessage(error, '엑셀 다운로드 중 오류가 발생했습니다.');
    if (parsed.aborted) return { success: false, aborted: true, error: parsed.message };
    return { success: false, error: parsed.message, status: parsed.status };
  }
};
