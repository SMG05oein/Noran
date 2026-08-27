package com.recode.Dwaeji.work_apply_work.dto;

import com.recode.Dwaeji.work_apply_work.database.ApplyStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorkApplyWorkRequestDto {
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
    // 관리자가 특정 유저의 신청을 대리 작성/수정할 경우를 위해
    private Long userIdx; 
}
