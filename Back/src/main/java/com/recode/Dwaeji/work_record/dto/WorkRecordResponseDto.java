package com.recode.Dwaeji.work_record.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.recode.Dwaeji.work_record.database.WorkRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkRecordResponseDto {
    private Long wrIdx;
    private Long userIdx;
    /** 로그인 아이디 — 관리자 화면 보조 표시용 (동명이인 배지는 userIdx) */
    private String userId;
    private String userName; // 유저 이름
    private Long workPlaceIdx; // 근무 기록의 근무지 idx
    private String workPlaceName; // 근무 기록의 근무지 (기록 당시 지점 기준)
    private String userWorkPlaceName; // 유저 소속 지점 (필터링용)
    private LocalDate wrDate;
    
    @JsonFormat(pattern = "HH:mm")
    private LocalTime wrStartTime;
    
    @JsonFormat(pattern = "HH:mm")
    private LocalTime wrEndTime;
    
    @JsonFormat(pattern = "HH:mm")
    private LocalTime wrRestTime;
    
    private String wrRemarks;
    /** 등록자 userIdx (관리자 대리 등록 시 관리자) */
    private Long wrCreatedBy;
    private LocalDateTime wrCreatedAt;
    private LocalDateTime wrUpdatedAt;
    private String applyStatus; // 해당 날짜의 근무 상태 (null | 신청 | 미출근 | 출근)
    /** 동명이인 플래그: 동일 실명 활성 인원 수. &gt;1 이면 관리자 UI에 #userIdx */
    private Long nameSeq;
    /** 알바 수정 가능 기한 (근무일 기준 계산) */
    private LocalDateTime editableUntil;
    private Boolean isEditable;

    public static WorkRecordResponseDto fromEntity(WorkRecord entity, String applyStatus) {
        if (entity == null) return null;
        // 근무 기록에 workPlace가 있으면 그걸 우선, 없으면 유저 소속 지점
        Long wpIdx = entity.getWorkPlace() != null ? entity.getWorkPlace().getWpIdx()
                   : (entity.getUser() != null && entity.getUser().getWorkPlace() != null ? entity.getUser().getWorkPlace().getWpIdx() : null);
        String wpName = entity.getWorkPlace() != null ? entity.getWorkPlace().getWpName()
                      : (entity.getUser() != null && entity.getUser().getWorkPlace() != null ? entity.getUser().getWorkPlace().getWpName() : null);
        String userWpName = entity.getUser() != null && entity.getUser().getWorkPlace() != null ? entity.getUser().getWorkPlace().getWpName() : null;
        return WorkRecordResponseDto.builder()
                .wrIdx(entity.getWrIdx())
                .userIdx(entity.getUser() != null ? entity.getUser().getUserIdx() : null)
                .userId(entity.getUser() != null ? entity.getUser().getUserId() : null)
                .userName(entity.getUser() != null ? entity.getUser().getUserName() : null)
                .workPlaceIdx(wpIdx)
                .workPlaceName(wpName)
                .userWorkPlaceName(userWpName)
                .wrDate(entity.getWrDate())
                .wrStartTime(entity.getWrStartTime())
                .wrEndTime(entity.getWrEndTime())
                .wrRestTime(entity.getWrRestTime())
                .wrRemarks(entity.getWrRemarks())
                .wrCreatedBy(entity.getWrCreatedBy())
                .wrCreatedAt(entity.getWrCreatedAt())
                .wrUpdatedAt(entity.getWrUpdatedAt())
                .applyStatus(applyStatus)
                .build();
    }
}
