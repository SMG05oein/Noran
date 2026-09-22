/** Peak / open shift helpers for assign + admin main */

const statusOf = (s) => s?.wsdStatus || s?.status || '';
const timeOf = (s) => String(s?.wsdStartTime || s?.startTime || '').trim();

export const isOpenShift = (shift) => {
  if (!shift) return false;
  if (shift.wsdIsOpen === true || shift.isOpen === true) return true;
  return timeOf(shift) === '오픈';
};

export const isAssignmentShift = (shift, { requireConfirmed = false } = {}) => {
  if (!shift) return false;
  const st = statusOf(shift);
  if (st === '미신청' || st === '신청' || st === '미배정' || st === '신규') return false;
  if (st && st !== '배정' && st !== '타지점근무' && st !== '출근') return false;
  // no status → treat as assignment row (daily API)
  if (!requireConfirmed) return true;
  if (shift.wsdIsConfirmed == null && shift.isConfirmed == null) return true;
  return shift.wsdIsConfirmed === true || shift.isConfirmed === true;
};

/** 16:00 ≤ t < 20:00, excludes open shifts */
export const isPeakShift = (shift, opts) => {
  if (!isAssignmentShift(shift, opts)) return false;
  if (isOpenShift(shift)) return false;
  const raw = timeOf(shift).substring(0, 5);
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return false;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return mins >= 16 * 60 && mins < 20 * 60;
};

export const countTotal = (shifts, opts) =>
  (shifts || []).filter((s) => isAssignmentShift(s, opts)).length;

export const countPeak = (shifts, opts) =>
  (shifts || []).filter((s) => isPeakShift(s, opts)).length;
