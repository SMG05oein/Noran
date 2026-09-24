package com.recode.Dwaeji.work_apply_work;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.HashSet;
import java.util.Set;

/**
 * 오픈 출근 시각 규칙: 평일 16:00, 주말·공휴일 10:00.
 * Front {@code openStartTimeForDate} / holiday-kr 과 동일 취지.
 */
public final class OpenShiftRules {

    public static final String OPEN_WEEKDAY = "16:00";
    public static final String OPEN_WEEKEND_OR_HOLIDAY = "10:00";
    public static final String OPEN_LABEL = "오픈";

    private OpenShiftRules() {}

    /** 해당 날짜의 공식 오픈 시작 시각 (HH:mm). */
    public static String expectedOpenStart(LocalDate date) {
        if (date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜가 없습니다.");
        }
        return isWeekendOrHoliday(date) ? OPEN_WEEKEND_OR_HOLIDAY : OPEN_WEEKDAY;
    }

    public static boolean isWeekendOrHoliday(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return true;
        }
        return KoreanPublicHolidays.isHoliday(date);
    }

    /**
     * 오픈 배정이면 시각을 공식값으로 정규화. 잘못된 시각이면 400.
     *
     * @return [isOpen, startTime] — 오픈이 아니면 입력 그대로
     */
    public static NormalizedOpen normalizeScheduleOpen(LocalDate date, Boolean isOpen, String startTime) {
        String raw = startTime == null ? "" : startTime.trim();
        String hhmm = extractHhMm(raw);
        boolean flaggedOpen = Boolean.TRUE.equals(isOpen) || OPEN_LABEL.equals(raw);

        if (!flaggedOpen) {
            return new NormalizedOpen(false, raw.isEmpty() ? null : (hhmm != null ? hhmm : raw));
        }

        String expected = expectedOpenStart(date);
        if (raw.isEmpty() || OPEN_LABEL.equals(raw) || expected.equals(hhmm) || expected.equals(raw)) {
            return new NormalizedOpen(true, expected);
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "오픈 출근 시각은 평일 " + OPEN_WEEKDAY + ", 주말·공휴일 " + OPEN_WEEKEND_OR_HOLIDAY
                        + "만 가능합니다. (" + date + " → " + expected + ")");
    }

    private static String extractHhMm(String raw) {
        if (raw == null || raw.isBlank()) return null;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d{1,2}):(\\d{2})").matcher(raw);
        if (!m.find()) return null;
        int h = Integer.parseInt(m.group(1));
        int min = Integer.parseInt(m.group(2));
        if (h < 0 || h > 23 || min < 0 || min > 59) return null;
        return String.format("%02d:%02d", h, min);
    }

    public record NormalizedOpen(boolean isOpen, String startTime) {}

    /**
     * 고정 공휴일 + 설·추석·부처님오신날(2024–2032) + 주요 대체공휴일.
     * Front holiday-kr 과 완전히 동일하진 않을 수 있으나 운영 연도 범위에서 맞춤.
     */
    static final class KoreanPublicHolidays {
        private static final Set<LocalDate> EXTRA = new HashSet<>();

        static {
            // 설·추석·부처님 (연휴 포함) + 알려진 대체공휴일
            addRange(2024, 2, 9, 12);
            EXTRA.add(LocalDate.of(2024, 5, 15));
            addRange(2024, 9, 16, 18);
            EXTRA.add(LocalDate.of(2024, 2, 12)); // 설 대체
            EXTRA.add(LocalDate.of(2024, 5, 6));  // 어린이날 대체

            addRange(2025, 1, 27, 30);
            EXTRA.add(LocalDate.of(2025, 5, 5)); // 부처=어린이날 겹침
            EXTRA.add(LocalDate.of(2025, 5, 6)); // 대체
            addRange(2025, 10, 5, 8);
            EXTRA.add(LocalDate.of(2025, 3, 3)); // 삼일절 대체
            EXTRA.add(LocalDate.of(2025, 10, 8)); // 추석 대체

            addRange(2026, 2, 16, 18);
            EXTRA.add(LocalDate.of(2026, 5, 24));
            EXTRA.add(LocalDate.of(2026, 5, 25)); // 부처 대체
            addRange(2026, 9, 24, 26);
            EXTRA.add(LocalDate.of(2026, 8, 17)); // 광복절 대체
            EXTRA.add(LocalDate.of(2026, 10, 5)); // 개천절 대체

            addRange(2027, 2, 6, 9);
            EXTRA.add(LocalDate.of(2027, 5, 13));
            addRange(2027, 9, 14, 16);
            EXTRA.add(LocalDate.of(2027, 8, 16)); // 광복절 대체
            EXTRA.add(LocalDate.of(2027, 10, 4)); // 개천절 대체
            EXTRA.add(LocalDate.of(2027, 10, 11)); // 한글날 대체

            addRange(2028, 1, 26, 28);
            EXTRA.add(LocalDate.of(2028, 5, 2));
            addRange(2028, 10, 2, 4);
            EXTRA.add(LocalDate.of(2028, 5, 7)); // 어린이날 대체
            EXTRA.add(LocalDate.of(2028, 10, 4)); // 추석 연휴 내

            addRange(2029, 2, 12, 14);
            EXTRA.add(LocalDate.of(2029, 5, 20));
            EXTRA.add(LocalDate.of(2029, 5, 21));
            addRange(2029, 9, 21, 24);

            addRange(2030, 2, 2, 5);
            EXTRA.add(LocalDate.of(2030, 5, 9));
            addRange(2030, 9, 11, 13);
            EXTRA.add(LocalDate.of(2030, 5, 6)); // 어린이날 대체
            EXTRA.add(LocalDate.of(2030, 8, 15));
            EXTRA.add(LocalDate.of(2030, 10, 9));
            EXTRA.add(LocalDate.of(2030, 10, 14)); // 한글날·개천 근처 대체 여유

            addRange(2031, 1, 22, 24);
            EXTRA.add(LocalDate.of(2031, 5, 28));
            addRange(2031, 10, 1, 3);
            EXTRA.add(LocalDate.of(2031, 3, 3));
            EXTRA.add(LocalDate.of(2031, 5, 5));
            EXTRA.add(LocalDate.of(2031, 5, 6));

            addRange(2032, 2, 10, 12);
            EXTRA.add(LocalDate.of(2032, 5, 16));
            EXTRA.add(LocalDate.of(2032, 5, 17));
            addRange(2032, 9, 19, 21);
        }

        private static void addRange(int y, int m, int d1, int d2) {
            for (int d = d1; d <= d2; d++) {
                EXTRA.add(LocalDate.of(y, m, d));
            }
        }

        static boolean isHoliday(LocalDate date) {
            if (EXTRA.contains(date)) return true;
            MonthDay md = MonthDay.from(date);
            // 고정 공휴일
            if (md.equals(MonthDay.of(1, 1))) return true;   // 신정
            if (md.equals(MonthDay.of(3, 1))) return true;   // 삼일절
            if (md.equals(MonthDay.of(5, 5))) return true;   // 어린이날
            if (md.equals(MonthDay.of(6, 6))) return true;   // 현충일
            if (md.equals(MonthDay.of(8, 15))) return true;  // 광복절
            if (md.equals(MonthDay.of(10, 3))) return true;  // 개천절
            if (md.equals(MonthDay.of(10, 9))) return true;  // 한글날
            if (md.equals(MonthDay.of(12, 25))) return true; // 성탄절
            // 일요일이면 다음 평일 대체 (어린이날·삼일·광복·개천·한글·성탄 — 관례적)
            return isSubstituteMonday(date);
        }

        /** 공휴일이 일요일인 경우 다음 월요일이 대체공휴일인 패턴 (단순화). */
        private static boolean isSubstituteMonday(LocalDate date) {
            if (date.getDayOfWeek() != DayOfWeek.MONDAY) return false;
            LocalDate sun = date.minusDays(1);
            MonthDay md = MonthDay.from(sun);
            return md.equals(MonthDay.of(3, 1))
                    || md.equals(MonthDay.of(5, 5))
                    || md.equals(MonthDay.of(8, 15))
                    || md.equals(MonthDay.of(10, 3))
                    || md.equals(MonthDay.of(10, 9))
                    || md.equals(MonthDay.of(12, 25));
        }
    }
}
