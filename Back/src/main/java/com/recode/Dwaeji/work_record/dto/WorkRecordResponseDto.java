package com.recode.Dwaeji.work_record.dto;

import lombok.Builder;

import lombok.AllArgsConstructor;

import lombok.NoArgsConstructor;

import lombok.Setter;

import lombok.Getter;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkRecordResponseDto {
    private Long wrIdx;
    private Long userIdx;
    private String userName; // 유저 이름도 함께 보내주면 프론트에서 편함
    private String workPlaceName; // 지점 필터링용
    private LocalDate wrDate;
    
    @JsonFormat(pattern = "HH:mm")
    private LocalTime wrStartTime;
    
    @JsonFormat(pattern = "HH:mm")
    private LocalTime wrEndTime;
    
    @JsonFormat(pattern = "HH:mm")
    private LocalTime wrRestTime;
    
    private String wrRemarks;
    private LocalDateTime wrCreatedAt;
    private LocalDateTime wrUpdatedAt;
    private String applyStatus; // 해당 날짜의 근무 신청 상태 (맸들 없습니다, 신청, 수락, 반려)
}
