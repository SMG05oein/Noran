/** Peak / open / close shift helpers for assign + admin main */

const statusOf = (s) => s?.wsdStatus || s?.status || '';
const timeOf = (s) => String(s?.wsdStartTime || s?.startTime || '').trim();

export const isOpenShift = (shift) => {
  if (!shift) return false;
  if (shift.wsdIsOpen === true || shift.isOpen === true) return true;
  return timeOf(shift) === '오픈';
};

export const isCloseShift = (shift) => {
  if (!shift) return false;
  if (shift.wsdIsClose === true || shift.isClose === true) return true;
  return timeOf(shift) === '마감';
};

export const isAssignmentShift = (shift, { requireConfirmed = false } = {}) => {
  if (!shift) return false;
  const st = statusOf(shift);

  if (['미신청', '신청', '미배정', '미출근', '신규'].includes(st)) {
    return false;
  }

  const hasAttendingStatus = st === '출근' || st === '배정' || st === '타지점근무';
  const hasAttendingMarker = Boolean(
    shift.wsdIsOpen ||
    shift.isOpen ||
    shift.wsdIsClose ||
    shift.isClose ||
    (timeOf(shift) && timeOf(shift) !== '미출근')
  );

  if (!hasAttendingStatus && !hasAttendingMarker) {
    return false;
  }

  if (!requireConfirmed) return true;
  if (shift.wsdIsConfirmed == null && shift.isConfirmed == null) return true;
  return shift.wsdIsConfirmed === true || shift.isConfirmed === true;
};

/**
 * 피크 근무 여부:
 * 실제 배정 근무(출근) 중 오픈(wsdIsOpen/isOpen/'오픈')과 마감(wsdIsClose/isClose/'마감')이 모두 체크되지 않은 근무를 피크 인원으로 카운트
 */
export const isPeakShift = (shift, opts) => {
  if (!isAssignmentShift(shift, opts)) return false;
  if (isOpenShift(shift)) return false;
  if (isCloseShift(shift)) return false;
  return true;
};

export const countTotal = (shifts, opts) =>
  (shifts || []).filter((s) => isAssignmentShift(s, opts)).length;

export const countPeak = (shifts, opts) =>
  (shifts || []).filter((s) => isPeakShift(s, opts)).length;
