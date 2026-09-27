package com.recode.Dwaeji.work_record.excelcompare;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
public class ExcelCompareSession {
    private String sessionId;
    private String requesterId;
    private int year;
    private int month;
    private List<ExcelCompareParsedRow> rows;
    /** rowIndex → userIdx after admin resolution */
    @Builder.Default
    private Map<Integer, Long> resolutions = new HashMap<>();
    private byte[] resultBytes;
    @Builder.Default
    private volatile String phase = "PROCESSING";
    @Builder.Default
    private volatile int progress = 0;
    private Map<String, Integer> statusCounts;
    private Integer totalCount;
    private Instant createdAt;
}
