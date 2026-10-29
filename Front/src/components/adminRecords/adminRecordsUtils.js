export const calcHoursStr = (startStr, endStr, restStr) => {
  if (!startStr || !endStr) return '';
  const parseLocal = (t) => {
    if (typeof t === 'string' && t.includes(':')) {
      const parts = t.split(':');
      return { hour: parseInt(parts[0], 10), minute: parseInt(parts[1], 10) };
    }
    return { hour: 0, minute: 0 };
  };
  const start = parseLocal(startStr);
  const end = parseLocal(endStr);
  const rest = restStr ? parseLocal(restStr) : { hour: 0, minute: 0 };

  const startNum = start.hour + (start.minute / 60);
  let endNum = end.hour + (end.minute / 60);
  if (endNum < startNum) endNum += 24;
  const restNum = rest.hour + (rest.minute / 60);

  const total = Math.max(0, endNum - startNum - restNum);
  return ` (총 ${total % 1 === 0 ? total : total.toFixed(1)}시간)`;
};

export const formatHistoryTime = (log) => {
  const bStart = log.beforeStartTime ? log.beforeStartTime.substring(0, 5) : '-';
  const bEnd = log.beforeEndTime ? log.beforeEndTime.substring(0, 5) : '-';
  const bRest = log.beforeRestTime && log.beforeRestTime !== '00:00:00' ? ` (휴게 ${log.beforeRestTime.substring(0, 5)})` : '';
  const bHours = calcHoursStr(log.beforeStartTime, log.beforeEndTime, log.beforeRestTime);

  const aStart = log.afterStartTime ? log.afterStartTime.substring(0, 5) : '-';
  const aEnd = log.afterEndTime ? log.afterEndTime.substring(0, 5) : '-';
  const aRest = log.afterRestTime && log.afterRestTime !== '00:00:00' ? ` (휴게 ${log.afterRestTime.substring(0, 5)})` : '';
  const aHours = calcHoursStr(log.afterStartTime, log.afterEndTime, log.afterRestTime);

  return {
    oldVal: `${bStart} ~ ${bEnd}${bRest}${bHours}`,
    newVal: `${aStart} ~ ${aEnd}${aRest}${aHours}`
  };
};

export const calculateTotalHours = (record) => {
  if (!record.wrStartTime || !record.wrEndTime) return 0;
  const parseLocalTime = (t) => {
    if (Array.isArray(t)) return { hour: t[0], minute: t[1] };
    if (typeof t === 'string') {
      const parts = t.split(':');
      return { hour: parseInt(parts[0], 10), minute: parseInt(parts[1], 10) };
    }
    return { hour: 0, minute: 0 };
  };
  const start = parseLocalTime(record.wrStartTime);
  const end = parseLocalTime(record.wrEndTime);
  const rest = record.wrRestTime ? parseLocalTime(record.wrRestTime) : { hour: 0, minute: 0 };

  const startNum = start.hour + (start.minute / 60);
  let endNum = end.hour + (end.minute / 60);
  if (endNum < startNum) endNum += 24;
  const restNum = rest.hour + (rest.minute / 60);

  return Math.max(0, endNum - startNum - restNum);
};

export const formatTimeStr = (t) => {
  if (Array.isArray(t)) return `${String(t[0]).padStart(2, '0')}:${String(t[1]).padStart(2, '0')}`;
  if (typeof t === 'string' && t.length >= 5) return t.substring(0, 5);
  return '-';
};

export const formatDateStr = (d) => {
  if (Array.isArray(d)) return `${d[0]}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}`;
  return d || '-';
};

