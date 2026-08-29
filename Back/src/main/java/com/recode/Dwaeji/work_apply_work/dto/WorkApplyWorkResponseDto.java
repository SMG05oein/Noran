package com.recode.Dwaeji.work_apply_work.dto;

import com.recode.Dwaeji.user.database.User;
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

    private Long wawMonWorkPlaceIdx;
    private String wawMonWorkPlaceName;
    private Long wawTueWorkPlaceIdx;
    private String wawTueWorkPlaceName;
    private Long wawWedWorkPlaceIdx;
    private String wawWedWorkPlaceName;
    private Long wawThuWorkPlaceIdx;
    private String wawThuWorkPlaceName;
    private Long wawFriWorkPlaceIdx;
    private String wawFriWorkPlaceName;
    private Long wawSatWorkPlaceIdx;
    private String wawSatWorkPlaceName;
    private Long wawSunWorkPlaceIdx;
    private String wawSunWorkPlaceName;

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
                .wawMonWorkPlaceIdx(entity.getWawMonWorkPlace() != null ? entity.getWawMonWorkPlace().getWpIdx() : null)
                .wawMonWorkPlaceName(entity.getWawMonWorkPlace() != null ? entity.getWawMonWorkPlace().getWpName() : null)
                .wawTueWorkPlaceIdx(entity.getWawTueWorkPlace() != null ? entity.getWawTueWorkPlace().getWpIdx() : null)
                .wawTueWorkPlaceName(entity.getWawTueWorkPlace() != null ? entity.getWawTueWorkPlace().getWpName() : null)
                .wawWedWorkPlaceIdx(entity.getWawWedWorkPlace() != null ? entity.getWawWedWorkPlace().getWpIdx() : null)
                .wawWedWorkPlaceName(entity.getWawWedWorkPlace() != null ? entity.getWawWedWorkPlace().getWpName() : null)
                .wawThuWorkPlaceIdx(entity.getWawThuWorkPlace() != null ? entity.getWawThuWorkPlace().getWpIdx() : null)
                .wawThuWorkPlaceName(entity.getWawThuWorkPlace() != null ? entity.getWawThuWorkPlace().getWpName() : null)
                .wawFriWorkPlaceIdx(entity.getWawFriWorkPlace() != null ? entity.getWawFriWorkPlace().getWpIdx() : null)
                .wawFriWorkPlaceName(entity.getWawFriWorkPlace() != null ? entity.getWawFriWorkPlace().getWpName() : null)
                .wawSatWorkPlaceIdx(entity.getWawSatWorkPlace() != null ? entity.getWawSatWorkPlace().getWpIdx() : null)
                .wawSatWorkPlaceName(entity.getWawSatWorkPlace() != null ? entity.getWawSatWorkPlace().getWpName() : null)
                .wawSunWorkPlaceIdx(entity.getWawSunWorkPlace() != null ? entity.getWawSunWorkPlace().getWpIdx() : null)
                .wawSunWorkPlaceName(entity.getWawSunWorkPlace() != null ? entity.getWawSunWorkPlace().getWpName() : null)
                .wawRemarks(entity.getWawRemarks())
                .wawCreatedAt(entity.getWawCreatedAt())
                .wawUpdatedAt(entity.getWawUpdatedAt())
                .build();
    }

    public static WorkApplyWorkResponseDto emptyForUser(User user) {
        return emptyForUser(user, null);
    }

    public static WorkApplyWorkResponseDto emptyForUser(User user, LocalDate wawDate) {
        if (user == null) return null;
        Long homeWpIdx = user.getWorkPlace() != null ? user.getWorkPlace().getWpIdx() : null;
        String homeWpName = user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : null;
        return WorkApplyWorkResponseDto.builder()
                .userIdx(user.getUserIdx())
                .userName(user.getUserName())
                .workPlaceName(homeWpName)
                .wawDate(wawDate)
                .wawIsMon(ApplyStatus.미신청)
                .wawIsTue(ApplyStatus.미신청)
                .wawIsWed(ApplyStatus.미신청)
                .wawIsThu(ApplyStatus.미신청)
                .wawIsFri(ApplyStatus.미신청)
                .wawIsSat(ApplyStatus.미신청)
                .wawIsSun(ApplyStatus.미신청)
                .wawMonWorkPlaceIdx(homeWpIdx)
                .wawMonWorkPlaceName(homeWpName)
                .wawTueWorkPlaceIdx(homeWpIdx)
                .wawTueWorkPlaceName(homeWpName)
                .wawWedWorkPlaceIdx(homeWpIdx)
                .wawWedWorkPlaceName(homeWpName)
                .wawThuWorkPlaceIdx(homeWpIdx)
                .wawThuWorkPlaceName(homeWpName)
                .wawFriWorkPlaceIdx(homeWpIdx)
                .wawFriWorkPlaceName(homeWpName)
                .wawSatWorkPlaceIdx(homeWpIdx)
                .wawSatWorkPlaceName(homeWpName)
                .wawSunWorkPlaceIdx(homeWpIdx)
                .wawSunWorkPlaceName(homeWpName)
                .build();
    }
}
