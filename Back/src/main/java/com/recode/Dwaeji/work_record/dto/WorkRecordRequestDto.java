package com.recode.Dwaeji.work_record.dto;

import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkRecordRequestDto {
    private LocalDate wrDate;

    // ISO parsing: accepts both HH:mm and HH:mm:ss
    private LocalTime wrStartTime;

    private LocalTime wrEndTime;

    private LocalTime wrRestTime;
    
    @Size(max = 255, message = "비고는 255자 이하여야 합니다.")
    private String wrRemarks;
    // 관리자가 특정 유저의 기록을 생성/수정할 경우를 대비해 userIdx를 받음 (일반 유저는 무시하고 본인 ID로 세팅)
    private Long userIdx;
    // 근무지 지정 (null이면 유저의 소속 지점으로 자동 세팅)
    private Long workPlaceIdx;
}
