package com.recode.Dwaeji.work_apply_work.dto;

import lombok.Builder;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
