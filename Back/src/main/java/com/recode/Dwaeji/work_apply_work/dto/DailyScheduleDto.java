package com.recode.Dwaeji.work_apply_work.dto;

import lombok.AllArgsConstructor;

import lombok.NoArgsConstructor;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyScheduleDto {
    private Long userIdx;
    private String userName;
    private String workPlaceName;
    private String startTime;
}
