package com.recode.Dwaeji.work_record.excelcompare;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 대조 엑셀 헤더 매핑.
 * <ul>
 *   <li>필수 개념: 날짜 / 이름 / 근무지 / 출근 / 퇴근 / 휴게</li>
 *   <li>헤더에 해당 문자열이 포함되면 매핑 (예: {@code 출근 시간} → 출근)</li>
 *   <li>그 외 컬럼(No, 총근무시간 등)은 무시</li>
 *   <li>순서는 무관</li>
 * </ul>
 */
public final class ExcelCompareHeaders {
    /**
     * 논리 컬럼 키 (매핑 결과·에러 메시지용)
     */
    public static final List<String> REQUIRED = List.of(
            "날짜", "이름", "근무지", "출근", "퇴근", "휴게"
    );

    private ExcelCompareHeaders() {
    }

    /**
     * @param headerByColIndex 컬럼 인덱스 → 원본 헤더 문자열 (빈 칸 제외)
     * @param errorsOut        매핑 실패 시 메시지 추가
     * @return 논리키 → 컬럼 인덱스. 실패 시 빈 맵 또는 부분 맵(errorsOut 비지 않음)
     */
    public static Map<String, Integer> resolve(Map<Integer, String> headerByColIndex, List<String> errorsOut) {
        Map<String, Integer> resolved = new LinkedHashMap<>();
        Map<String, String> matchedRaw = new LinkedHashMap<>();

        for (Map.Entry<Integer, String> e : headerByColIndex.entrySet()) {
            int colIdx = e.getKey();
            String raw = e.getValue() != null ? e.getValue().trim() : "";
            if (raw.isEmpty()) {
                continue;
            }
            String key = matchLogicalKey(raw);
            if (key == null) {
                continue; // 추가 컬럼 무시
            }
            if (resolved.containsKey(key)) {
                errorsOut.add(key + " 컬럼이 중복입니다: \"" + matchedRaw.get(key) + "\", \"" + raw + "\"");
                continue;
            }
            resolved.put(key, colIdx);
            matchedRaw.put(key, raw);
        }

        for (String req : REQUIRED) {
            if (!resolved.containsKey(req)) {
                errorsOut.add(req + " 컬럼이 없습니다");
            }
        }
        return resolved;
    }

    /**
     * 헤더 문자열 → 논리 키. 해당 없으면 null(무시).
     */
    static String matchLogicalKey(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        String h = header.trim();
        // 더 긴/구체적 키워드 우선 (근무지 before 근무 alone 등)
        if (h.contains("근무지")) {
            return "근무지";
        }
        if (h.contains("날짜") || h.contains("일자")) {
            return "날짜";
        }
        if (h.contains("이름") || h.contains("성명")) {
            return "이름";
        }
        if (h.contains("출근")) {
            return "출근";
        }
        if (h.contains("퇴근")) {
            return "퇴근";
        }
        if (h.contains("휴게") || h.contains("휴식")) {
            return "휴게";
        }
        return null;
    }
}
