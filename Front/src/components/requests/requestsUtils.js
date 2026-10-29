import { getDay } from 'date-fns';
import { isHoliday } from 'holiday-kr';

export const DAY_LABELS = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토', 0: '일' };
export const DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const WEEKENDS = ['Sat', 'Sun'];

export const isPublicAssignment = (s) =>
  (s?.wsdStatus === '출근' || s?.wsdStatus === '배정' || s?.wsdStatus === '타지점근무') && s?.wsdIsConfirmed === true;

/** 빈 칸 (null / 레거시 미신청) — 신청 이력 없음 */
export const isBlankStatus = (status) => !status || status === '미신청';

/** 알바생 비공개 (확정 미출근 등) — 이력에는 남기되 상태/시간 비공개 */
export const isWorkerHiddenStatus = (status) => status === '미배정';

/** 알바생이 직접 신청한 근무인지 여부 (관리자 직권 배정 제외) */
export const isUserAppliedShift = (s) => {
  if (!s) return false;
  if (s.isSelfApplied === true || s.selfApplied === true) return true;
  if (s.isSelfApplied === false || s.selfApplied === false) return false;
  if (s.applyWorkPlaceIdx != null && s.applyWorkPlaceIdx !== '') return true;
  if (s.openApplied === true) return true;
  return s.wsdStatus === '신청';
};

export const toDateStr = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  if (Array.isArray(value) && value.length >= 3) {
    return `${value[0]}-${String(value[1]).padStart(2, '0')}-${String(value[2]).padStart(2, '0')}`;
  }
  return String(value);
};

export const displayStatusLabel = (s) => {
  if (isPublicAssignment(s)) return '출근';
  if (s?.wsdStatus === '신청') return '신청';
  if (s?.wsdStatus === '미출근' || s?.wsdStatus === '미배정') return '미배정';
  return '';
};

export const displayOpenTime = (s, dateObj) => {
  const isHoli = isHoliday(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
  if (s.wsdStartTime === '오픈' || s.isOpen === true || s.openApplied === true || s.wsdIsOpen === true) {
    const d = getDay(dateObj);
    return (d === 0 || d === 6 || isHoli) ? '10:00 (오픈)' : '16:00 (오픈)';
  }
  return s.wsdStartTime ? `${String(s.wsdStartTime).substring(0, 5)} 출근` : '';
};

