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
    private String userName; // 유저 이름
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
    private String applyStatus; // 해당 날짜의 근무 신청 상태 (신청 없음, 신청, 수락, 반려)

    public static WorkRecordResponseDto fromEntity(WorkRecord entity, String applyStatus) {
        if (entity == null) return null;
        return WorkRecordResponseDto.builder()
                .wrIdx(entity.getWrIdx())
                .userIdx(entity.getUser() != null ? entity.getUser().getUserIdx() : null)
                .userName(entity.getUser() != null ? entity.getUser().getUserName() : null)
                .workPlaceName(entity.getUser() != null && entity.getUser().getWorkPlace() != null ? entity.getUser().getWorkPlace().getWpName() : null)
                .wrDate(entity.getWrDate())
                .wrStartTime(entity.getWrStartTime())
                .wrEndTime(entity.getWrEndTime())
                .wrRestTime(entity.getWrRestTime())
                .wrRemarks(entity.getWrRemarks())
                .wrCreatedAt(entity.getWrCreatedAt())
                .wrUpdatedAt(entity.getWrUpdatedAt())
                .applyStatus(applyStatus)
                .build();
    }
}
