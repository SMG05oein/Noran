import { getYear, getMonth, getDate, isSunday, isSaturday } from 'date-fns';
import { isHoliday } from 'holiday-kr';
import { withBaseline, isShiftDirty } from '../../utils/shiftReset';

export const FILTERS = [
  { value: 'ALL', name: '전체' },
  { value: 'ATTENDING', name: '출근' },
  { value: 'NOT_ATTENDING', name: '미출근' }
];

export const DAY_FILTER_OPTIONS = [
  { value: 'ALL', name: '전체' },
  { value: '0', name: '월' },
  { value: '1', name: '화' },
  { value: '2', name: '수' },
  { value: '3', name: '목' },
  { value: '4', name: '금' },
  { value: '5', name: '토' },
  { value: '6', name: '일' }
];

export const LEGEND = [
  { tone: 'unapplied', label: '미신청' },
  { tone: 'applied', label: '신청' },
  { tone: 'unassigned', label: '미출근' },
  { tone: 'assigned', label: '출근' }
];

export const toUserIdx = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
};

export const createEmptyShift = (userIdx, dateStr, workPlaceIdx, status = null) => withBaseline({
  _id: Math.random().toString(36).slice(2, 11),
  userIdx,
  date: dateStr,
  wsdStatus: status,
  wsdStartTime: '',
  wsdWorkPlaceIdx: workPlaceIdx,
  wsdIsConfirmed: false,
  wsdIsOpen: false,
  wsdIsClose: false,
  openApplied: false,
  originHadApply: false,
  originOpenApplied: false
});

export const displayShiftStatus = (shift) => {
  const st = shift?.wsdStatus;
  if (!st) return '미신청';
  if (st === '신청' && shift.originOpenApplied && !shift.wsdIsOpen) return '신청 · 오픈';
  return st;
};

export const getShiftTone = (shift) => {
  const st = shift.wsdStatus;
  if (st === '출근' && (shift.wsdStartTime || shift.wsdIsOpen || shift.wsdIsClose)) return 'assigned';
  if (st === '신청') return 'applied';
  if (st === '미출근') return 'unassigned';
  return 'unapplied';
};

export const canResetShift = (shift) => isShiftDirty(shift);

export const dayMeta = (date) => {
  const y = getYear(date);
  const m = getMonth(date) + 1;
  const d = getDate(date);
  const isHoly = isHoliday(y, m, d) || isSunday(date);
  const isSat = isSaturday(date) && !isHoly;
  return { isHoly, isSat };
};

