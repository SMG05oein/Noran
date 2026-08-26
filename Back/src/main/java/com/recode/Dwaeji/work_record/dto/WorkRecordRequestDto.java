package com.recode.Dwaeji.work_record.dto;

import lombok.Builder;

import lombok.AllArgsConstructor;

import lombok.NoArgsConstructor;

import lombok.Setter;

import lombok.Getter;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkRecordRequestDto {
    private LocalDate wrDate;
    
    @JsonFormat(pattern = "HH:mm")
    private LocalTime wrStartTime;
    
    @JsonFormat(pattern = "HH:mm")
    private LocalTime wrEndTime;
    
    @JsonFormat(pattern = "HH:mm")
    private LocalTime wrRestTime;
    
    private String wrRemarks;
    // 관리자가 특정 유저의 기록을 생성/수정할 경우를 대비해 userIdx를 받음 (일반 유저는 무시하고 본인 ID로 세팅)
    private Long userIdx; 
}
