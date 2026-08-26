package com.recode.Dwaeji.work_apply_work.dto;

import lombok.Builder;

import lombok.AllArgsConstructor;

import lombok.NoArgsConstructor;

import lombok.Setter;

import lombok.Getter;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import com.recode.Dwaeji.work_apply_work.database.ApplyStatus;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkApplyWorkResponseDto {
    private Long wawIdx;
    private Long userIdx;
    private String userName; // 뷰어용 유저 이름
    private String workPlaceName; // 소속 지점 필터링 용도
    private LocalDate wawDate;
    private ApplyStatus wawIsMon;
    private ApplyStatus wawIsTue;
    private ApplyStatus wawIsWed;
    private ApplyStatus wawIsThu;
    private ApplyStatus wawIsFri;
    private ApplyStatus wawIsSat;
    private ApplyStatus wawIsSun;

    private LocalTime wawMonStartTime;
    private LocalTime wawTueStartTime;
    private LocalTime wawWedStartTime;
    private LocalTime wawThuStartTime;
    private LocalTime wawFriStartTime;
    private LocalTime wawSatStartTime;
    private LocalTime wawSunStartTime;

    private String wawRemarks;
    private LocalDateTime wawCreatedAt;
    private LocalDateTime wawUpdatedAt;
}
