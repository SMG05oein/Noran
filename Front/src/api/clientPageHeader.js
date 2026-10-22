export const CLIENT_PAGE_HEADER = 'X-Client-Page';

/** 현재 브라우저 페이지 전체 URL (예: https://dwaeji.jp/dev/dashboard) */
export const getClientPageUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.location.href || '';
};

/** axios headers 객체에 넣을 plain map */
export const getClientPageHeader = () => {
  const href = getClientPageUrl();
  return href ? { [CLIENT_PAGE_HEADER]: href } : {};
};

/**
 * AxiosHeaders / plain headers 모두 지원해 X-Client-Page 주입.
 * (크로스 오리진 api.dwaeji.jp 호출 시 BE가 requestPage로 사용)
 */
export const applyClientPageHeader = (headers) => {
  const href = getClientPageUrl();
  if (!href) return headers;
  if (!headers) return { [CLIENT_PAGE_HEADER]: href };

  if (typeof headers.set === 'function') {
    headers.set(CLIENT_PAGE_HEADER, href);
  } else {
    headers[CLIENT_PAGE_HEADER] = href;
  }
  return headers;
};
