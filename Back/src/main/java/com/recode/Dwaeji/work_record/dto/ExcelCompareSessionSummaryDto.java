package com.recode.Dwaeji.work_record.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelCompareSessionSummaryDto {
    private String sessionId;
    private String phase;
    private Integer progress;
    private int year;
    private int month;
    private Instant createdAt;
    private boolean hasResult;
    private Map<String, Integer> statusCounts;
    private Integer totalCount;
}
