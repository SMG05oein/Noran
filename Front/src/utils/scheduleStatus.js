/** Schedule status — Back enum: 출근 | 미출근 | 신청 | null(빈 칸) */

export const coerceStatus = (raw) => {
  if (raw == null || raw === '' || raw === '미신청') return null;
  if (raw === '배정' || raw === '타지점근무' || raw === '신규') return '출근';
  if (raw === '미배정') return '미출근';
  return raw;
};

export const isWorkStatus = (status) => coerceStatus(status) === '출근';

export const isOffStatus = (status) => coerceStatus(status) === '미출근';
