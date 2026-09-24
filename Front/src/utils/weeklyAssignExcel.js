import { format, endOfWeek, getYear, getMonth, getDate, getDay, isSunday, isSaturday } from 'date-fns';
import { isHoliday } from 'holiday-kr';

const WEEKDAY = '일월화수목금토';

/** 다크모드 톤 + zebra striping */
const BG_META = '1E1A18';
const BG_HEADER = '2A2420';
const BG_ROW_A = '25201D';
const BG_ROW_B = '322B27';
const TEXT = 'F0EBE6';
const TEXT_MUTED = 'B8AFA6';
const TEXT_HOLY = 'F07178';
const TEXT_SAT = '6BA3D6';
const BORDER_COLOR = '4A433C';

const border = {
  top: { style: 'thin', color: { rgb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { rgb: BORDER_COLOR } },
  left: { style: 'thin', color: { rgb: BORDER_COLOR } },
  right: { style: 'thin', color: { rgb: BORDER_COLOR } },
};

const cellStyle = ({
  bg = BG_ROW_A,
  bold = false,
  align = 'center',
  sz = 11,
  color = TEXT,
} = {}) => ({
  fill: { patternType: 'solid', fgColor: { rgb: bg } },
  font: {
    color: { rgb: color },
    bold,
    sz,
    name: '맑은 고딕',
  },
  alignment: {
    horizontal: align,
    vertical: 'center',
    wrapText: true,
  },
  border,
});

  const dayKind = (date) => {
  const y = getYear(date);
  const m = getMonth(date) + 1;
  const d = getDate(date);
  const holy = !!isHoliday(y, m, d) || isSunday(date);
  const sat = isSaturday(date) && !holy;
  return { holy, sat };
};

const dayHeaderLabel = (date) => {
  const wd = WEEKDAY[getDay(date)];
  return `${format(date, 'MM/dd')}(${wd})`;
};

/** 출근만 표시 (신청/미출근/빈 칸 제외) */
const cellLabel = (shifts) => {
  if (!shifts || shifts.length === 0) return '';
  return shifts
    .map((s) => {
      const status = s.wsdStatus || '';
      if (!status || status === '신청' || status === '미출근' || status === '미신청' || status === '미배정') return '';
      if (s.wsdIsOpen) return '오픈';
      if (s.wsdStartTime && (status === '출근' || status === '배정' || status === '타지점근무')) {
        return String(s.wsdStartTime).substring(0, 5);
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
};

const styledCell = (value, style) => ({ v: value ?? '', t: 's', s: style });

/** 주간 배정 그리드를 엑셀(.xlsx)로 다운로드 (xlsx는 클릭 시에만 로드) */
export const downloadWeeklyAssignExcel = async ({
  branchName,
  weekStart,
  weekDays,
  users,
  editSchedules,
  toUserIdx,
}) => {
  const XLSX = await import('xlsx-js-style');
  const xlsx = XLSX.default ?? XLSX;
  const dayHeaders = weekDays.map(dayHeaderLabel);
  const period = `${format(weekStart, 'yyyy-MM-dd')} ~ ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')}`;
  const colCount = 1 + dayHeaders.length;

  const aoa = [];

  // 메타
  const meta1 = Array(colCount).fill('');
  meta1[0] = '지점';
  meta1[1] = branchName || '';
  aoa.push(meta1.map((v, i) =>
    styledCell(v, cellStyle({
      bg: BG_META,
      bold: i === 0,
      align: 'left',
      color: i === 0 ? TEXT_MUTED : TEXT,
    }))
  ));

  const meta2 = Array(colCount).fill('');
  meta2[0] = '기간';
  meta2[1] = period;
  aoa.push(meta2.map((v, i) =>
    styledCell(v, cellStyle({
      bg: BG_META,
      bold: i === 0,
      align: 'left',
      color: i === 0 ? TEXT_MUTED : TEXT,
    }))
  ));

  // 범례
  const legend = Array(colCount).fill('');
  legend[0] = '표시';
  legend[1] = '일·공휴=빨강 / 토=파랑';
  aoa.push(legend.map((v, i) =>
    styledCell(v, cellStyle({
      bg: BG_META,
      align: 'left',
      sz: 9,
      color: TEXT_MUTED,
      bold: i === 0,
    }))
  ));

  // 요일 헤더 (주말·공휴 색)
  aoa.push([
    styledCell('알바생', cellStyle({ bg: BG_HEADER, bold: true, align: 'left', sz: 12 })),
    ...weekDays.map((date, idx) => {
      const { holy, sat } = dayKind(date);
      const color = holy ? TEXT_HOLY : sat ? TEXT_SAT : TEXT;
      return styledCell(dayHeaders[idx], cellStyle({
        bg: BG_HEADER,
        bold: true,
        sz: 11,
        color,
      }));
    }),
  ]);

  // 데이터: zebra striping
  users.forEach((u, rowIdx) => {
    const uid = toUserIdx(u.userIdx ?? u.id);
    const rawName = u.userName || '';
    const name = Number(u.nameSeq) > 1 && uid != null
      ? `${rawName} #${uid}`
      : rawName;
    const bg = rowIdx % 2 === 0 ? BG_ROW_A : BG_ROW_B;
    const dayCells = weekDays.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      return cellLabel(editSchedules[uid]?.[dateStr]);
    });
    aoa.push([
      styledCell(name, cellStyle({ bg, bold: true, align: 'left' })),
      ...dayCells.map((v) =>
        styledCell(v, cellStyle({
          bg,
          color: v ? TEXT : TEXT_MUTED,
        }))
      ),
    ]);
  });

  const ws = xlsx.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 14 }, ...dayHeaders.map(() => ({ wch: 11 }))];
  ws['!rows'] = aoa.map((_, idx) => ({
    hpt: idx === 3 ? 32 : 26,
  }));
  ws['!merges'] = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 1 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: colCount - 1 } },
  ];

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, '주간배정');
  xlsx.writeFile(wb, `주간배정_${branchName || '지점'}_${format(weekStart, 'yyyy-MM-dd')}.xlsx`);
};
