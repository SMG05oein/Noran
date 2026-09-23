import { format, parseISO, getYear, getMonth, getDate, getDay } from 'date-fns';
import { isHoliday } from 'holiday-kr';

export const openStartTimeForDate = (dateStr) => {
  const dateObj = parseISO(dateStr);
  const dayOfWeek = getDay(dateObj);
  const isHoli = isHoliday(getYear(dateObj), getMonth(dateObj) + 1, getDate(dateObj));
  return (dayOfWeek === 0 || dayOfWeek === 6 || isHoli) ? '10:00' : '16:00';
};

export const toDateStr = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  if (Array.isArray(value) && value.length >= 3) {
    return `${value[0]}-${String(value[1]).padStart(2, '0')}-${String(value[2]).padStart(2, '0')}`;
  }
  try {
    return format(value, 'yyyy-MM-dd');
  } catch {
    return String(value);
  }
};

/** API/레거시 → 현재 enum (출근|미출근|신청|null) */
export const coerceStatus = (raw) => {
  if (raw == null || raw === '' || raw === '미신청') return null;
  if (raw === '배정' || raw === '타지점근무' || raw === '신규') return '출근';
  if (raw === '미배정') return '미출근';
  return raw;
};

/** API 행 → 초기화용 원본 신청/오픈 스냅샷 */
export const resolveOriginFlags = (sch, status) => {
  const openApplied = !!sch?.openApplied;
  const applyWp = sch?.applyWorkPlaceIdx ?? sch?.applyWpIdx;
  const coerced = coerceStatus(status);
  const hasApply =
    openApplied
    || (applyWp != null && applyWp !== '')
    || !!sch?.applyWorkPlaceName
    || coerced === '신청'
    || coerced === '미출근';
  return {
    openApplied,
    originHadApply: hasApply,
    originOpenApplied: openApplied,
  };
};

export const normalizeScheduleStatus = (sch) => {
  const raw = sch?.wsdStatus ?? sch?.status;
  const coerced = coerceStatus(raw);
  if (coerced) return coerced;
  const { originHadApply } = resolveOriginFlags(sch, '');
  if (originHadApply && (sch?.openApplied || sch?.applyWorkPlaceIdx != null || sch?.applyWorkPlaceName)) {
    return '신청';
  }
  return null;
};

export const hadWorkApply = (shift) => {
  if (!shift) return false;
  if (shift.originHadApply === true) return true;
  if (shift.originHadApply === false) return false;
  return resolveOriginFlags(shift, shift.wsdStatus).originHadApply;
};

export const originOpenOf = (shift) => {
  if (!shift) return false;
  if (typeof shift.originOpenApplied === 'boolean') return shift.originOpenApplied;
  return !!shift.openApplied;
};

/** 로드/생성 시점 스냅샷 — 초기화는 이 기준으로 복원 (확정이면 확정본) */
export const withBaseline = (shift) => ({
  ...shift,
  baselineStatus: shift.wsdStatus ?? null,
  baselineStartTime: shift.wsdStartTime || '',
  baselineIsOpen: !!shift.wsdIsOpen,
  baselineIsConfirmed: !!shift.wsdIsConfirmed,
});

export const hasBaseline = (shift) =>
  !!shift && Object.prototype.hasOwnProperty.call(shift, 'baselineStatus');

/** 불러온(마지막 저장) 상태와 다른지 */
export const isShiftDirty = (shift) => {
  if (!shift || !hasBaseline(shift)) return false;
  return (
    (shift.wsdStatus ?? null) !== (shift.baselineStatus ?? null)
    || (shift.wsdStartTime || '') !== (shift.baselineStartTime || '')
    || !!shift.wsdIsOpen !== !!shift.baselineIsOpen
    || !!shift.wsdIsConfirmed !== !!shift.baselineIsConfirmed
  );
};

/**
 * 초기화 = 마지막 불러온 상태로 복원.
 * 확정 주차면 확정본, 임시면 임시 저장본, 신청만 있으면 신청으로.
 */
export const resetShiftFields = (target) => {
  if (hasBaseline(target)) {
    return {
      ...target,
      wsdStatus: target.baselineStatus,
      wsdStartTime: target.baselineStartTime || '',
      wsdIsOpen: !!target.baselineIsOpen,
      wsdIsConfirmed: !!target.baselineIsConfirmed,
      openApplied: false,
    };
  }
  // baseline 없는 예외: 신청/미신청으로
  const applied = hadWorkApply(target);
  return {
    ...target,
    wsdStatus: applied ? '신청' : null,
    wsdStartTime: '',
    wsdIsOpen: false,
    wsdIsConfirmed: false,
    openApplied: false,
    originHadApply: applied,
    originOpenApplied: originOpenOf(target),
  };
};
