/**
 * 동기 API 대기 중 가짜 진행률 티커.
 * from → toCap 까지 천천히 증가하고 toCap에서 멈춤.
 */
export function startSyncProgressTicker({
  from = 0,
  toCap = 90,
  onTick,
  intervalMs = 450,
} = {}) {
  let current = Math.min(from, toCap);
  onTick?.(Math.round(current));

  const id = setInterval(() => {
    if (current >= toCap) return;
    const remaining = toCap - current;
    // 초반엔 조금 더 빠르게, 캡에 가까워질수록 느리게
    const step = Math.max(0.4, remaining * 0.06);
    current = Math.min(toCap, current + step);
    onTick?.(Math.round(current));
  }, intervalMs);

  return {
    stop() {
      clearInterval(id);
    },
    set(value) {
      current = value;
      onTick?.(Math.round(current));
    },
  };
}

export const EXCEL_LIMIT_MESSAGES = {
  DOWNLOAD_413: '행 수 초과, 근무지별로 나눠 다운로드',
  UPLOAD_413: '행 수 초과(최대 20,000건), 근무지별로 나눠 업로드해 주세요.',
  OOM_507: '서버 메모리 부족, 범위를 줄여 다시 시도',
};

export const EXCEL_UPLOAD_MAX_RECORDS = 20000;

/** axios 취소/abort 여부 */
export const isRequestAborted = (error) =>
  error?.code === 'ERR_CANCELED' ||
  error?.name === 'CanceledError' ||
  error?.name === 'AbortError' ||
  (typeof error?.message === 'string' && /abort|cancel/i.test(error.message));

/** ErrorResponseDto / blob JSON 에서 msg 추출 */
export async function extractAxiosErrorMessage(error, fallback = '요청에 실패했습니다.') {
  if (isRequestAborted(error)) {
    return { aborted: true, message: '요청이 취소되었습니다.', status: null };
  }

  const status = error.response?.status;
  let data = error.response?.data;

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      data = null;
    }
  } else if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return { aborted: false, message: data || fallback, status };
    }
  }

  const message =
    (data && typeof data === 'object' && (data.msg || data.message)) ||
    fallback;

  return { aborted: false, message, status };
}
