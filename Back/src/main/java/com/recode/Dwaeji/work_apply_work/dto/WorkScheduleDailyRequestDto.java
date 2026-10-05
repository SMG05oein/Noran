package com.recode.Dwaeji.work_apply_work.dto;

import com.recode.Dwaeji.work_apply_work.database.ApplyStatus;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkScheduleDailyRequestDto {
    private Long userIdx;
    private LocalDate date;

    private ApplyStatus status;
    private String startTime; // "10:00" or "오픈"
    private Long workPlaceIdx;
    private Boolean isConfirmed;
    private Boolean isOpen;
}
