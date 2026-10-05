package com.recode.Dwaeji.work_record.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkRecordHistoryResponseDto {
    private Long wrhIdx;
    private Long wrIdx;
    private String adminName;
    private String targetUserName;
    private String workPlaceName;
    private LocalDate wrDate;
    private LocalTime beforeStartTime;
    private LocalTime beforeEndTime;
    private LocalTime beforeRestTime;
    private LocalTime afterStartTime;
    private LocalTime afterEndTime;
    private LocalTime afterRestTime;
    /**
     * CREATE | UPDATE | DELETE | RESTORE
     */
    private String actionType;
    private LocalDateTime wrhCreatedAt;
}
