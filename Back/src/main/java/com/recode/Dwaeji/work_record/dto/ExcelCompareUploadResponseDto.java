package com.recode.Dwaeji.work_record.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelCompareUploadResponseDto {
    /**
     * COLUMN_ERROR | DONE
     */
    private String phase;
    private Integer progress;
    private String sessionId;
    private List<String> messages;
    /**
     * @deprecated Front 선택 UI 없음. 하위 호환 필드만 유지.
     */
    @Deprecated
    private List<ExcelCompareAmbiguousItemDto> ambiguousItems;
    /**
     * DONE일 때 상태별 건수. 키 예: MATCH, AMBIGUOUS, MISSING_IN_DB, …
     */
    private Map<String, Integer> statusCounts;
    /**
     * DONE일 때 결과 행 총합 (statusCounts 합과 동일)
     */
    private Integer totalCount;
}
