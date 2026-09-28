package com.recode.Dwaeji.work_apply_work.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkApplyDailyRequestDto {
    private Long workPlaceIdx;
    private String remarks;
    private Boolean openApplied; // or isOpen
    private java.util.List<LocalDate> applyDates;
}
