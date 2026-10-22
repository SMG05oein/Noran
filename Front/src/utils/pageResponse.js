/**
 * Spring Data PagedModel (VIA_DTO) 응답 헬퍼.
 *
 * @typedef {Object} PageResponse
 * @property {Array} content
 * @property {{size:number,totalElements:number,totalPages:number,number:number}} page
 */

export const getPageInfo = (data) => {
  const page = data?.page || {};
  const content = Array.isArray(data?.content) ? data.content : [];
  const number = page.number ?? 0;
  const totalPages = page.totalPages ?? 0;
  return {
    content,
    number,
    size: page.size ?? content.length,
    totalElements: page.totalElements ?? content.length,
    totalPages,
    // 제거된 필드 파생
    first: number === 0,
    last: number + 1 >= totalPages,
    empty: content.length === 0,
    numberOfElements: content.length,
  };
};
