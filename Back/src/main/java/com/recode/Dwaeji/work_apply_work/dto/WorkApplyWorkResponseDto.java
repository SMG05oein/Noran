package com.recode.Dwaeji.work_apply_work.dto;

import com.recode.Dwaeji.work_apply_work.database.ApplyStatus;
import com.recode.Dwaeji.work_apply_work.database.WorkApplyWork;
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

    public static WorkApplyWorkResponseDto fromEntity(WorkApplyWork entity) {
        if (entity == null) return null;
        return WorkApplyWorkResponseDto.builder()
                .wawIdx(entity.getWawIdx())
                .userIdx(entity.getUser() != null ? entity.getUser().getUserIdx() : null)
                .userName(entity.getUser() != null ? entity.getUser().getUserName() : null)
                .workPlaceName(entity.getUser() != null && entity.getUser().getWorkPlace() != null ? entity.getUser().getWorkPlace().getWpName() : null)
                .wawDate(entity.getWawDate())
                .wawIsMon(entity.getWawIsMon())
                .wawIsTue(entity.getWawIsTue())
                .wawIsWed(entity.getWawIsWed())
                .wawIsThu(entity.getWawIsThu())
                .wawIsFri(entity.getWawIsFri())
                .wawIsSat(entity.getWawIsSat())
                .wawIsSun(entity.getWawIsSun())
                .wawMonStartTime(entity.getWawMonStartTime())
                .wawTueStartTime(entity.getWawTueStartTime())
                .wawWedStartTime(entity.getWawWedStartTime())
                .wawThuStartTime(entity.getWawThuStartTime())
                .wawFriStartTime(entity.getWawFriStartTime())
                .wawSatStartTime(entity.getWawSatStartTime())
                .wawSunStartTime(entity.getWawSunStartTime())
                .wawRemarks(entity.getWawRemarks())
                .wawCreatedAt(entity.getWawCreatedAt())
                .wawUpdatedAt(entity.getWawUpdatedAt())
                .build();
    }

    public static WorkApplyWorkResponseDto emptyForUser(User user) {
        if (user == null) return null;
        return WorkApplyWorkResponseDto.builder()
                .userIdx(user.getUserIdx())
                .userName(user.getUserName())
                .workPlaceName(user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : null)
                .build();
    }
}
