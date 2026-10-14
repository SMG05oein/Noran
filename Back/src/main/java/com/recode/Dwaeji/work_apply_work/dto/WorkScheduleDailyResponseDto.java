package com.recode.Dwaeji.work_apply_work.dto;

import com.recode.Dwaeji.work_apply_work.database.ApplyStatus;
import com.recode.Dwaeji.work_apply_work.database.WorkApplyDaily;
import com.recode.Dwaeji.work_apply_work.database.WorkScheduleDaily;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkScheduleDailyResponseDto {
    private Long wsdIdx;
    private Long userIdx;
    private String userName; // 순수 이름 (전화번호 미포함)
    private Long nameSeq; // 동명이인 플래그: 동일 실명 활성 인원 수 (>1 → #userIdx)
    private String workPlaceName; // 알바생 소속 지점
    private LocalDate date;

    // 배정 내역 (관리자가 작성한 것)
    private ApplyStatus wsdStatus;
    private String wsdStartTime; // "10:00", "오픈" 등
    private Long wsdWorkPlaceIdx;
    private String wsdWorkPlaceName;
    private Boolean wsdIsConfirmed;
    private Boolean wsdIsOpen;
    private Boolean wsdIsClose;
    private String wsdRemarks;
    private LocalDateTime wsdCreatedAt;
    private LocalDateTime wsdUpdatedAt;

    // 신청 내역 (알바생이 신청한 원본)
    private boolean isSelfApplied; // 알바생 본인이 직접 신청했는지 여부 (WorkApplyDaily 존재 여부)
    private boolean openApplied; // 오픈조 지원 여부 (WorkApplyDaily.wadIsOpen)
    private Long applyWorkPlaceIdx; // 복수 지점 지원 대응
    private String applyWorkPlaceName;

    public static WorkScheduleDailyResponseDto fromEntityAndApply(WorkScheduleDaily schedule, WorkApplyDaily apply, String waRemarks) {
        if (schedule == null && apply == null) return null;

        LocalDate date = schedule != null ? schedule.getWsdDate() : apply.getWadDate();
        Long userIdx = schedule != null ? schedule.getUser().getUserIdx() : apply.getUser().getUserIdx();
        String userName = schedule != null ? schedule.getUser().getUserName() : apply.getUser().getUserName();
        String userHomeWpName = schedule != null && schedule.getUser().getWorkPlace() != null ? schedule.getUser().getWorkPlace().getWpName()
                : (apply != null && apply.getUser().getWorkPlace() != null ? apply.getUser().getWorkPlace().getWpName() : null);

        return WorkScheduleDailyResponseDto.builder()
                .wsdIdx(schedule != null ? schedule.getWsdIdx() : null)
                .userIdx(userIdx)
                .userName(userName)
                .workPlaceName(userHomeWpName)
                .date(date)

                .wsdStatus(schedule != null ? schedule.getWsdStatus() : (apply != null ? ApplyStatus.신청 : null))
                .wsdStartTime(schedule != null ? schedule.getWsdStartTime() : null)
                .wsdWorkPlaceIdx(schedule != null && schedule.getWorkPlace() != null ? schedule.getWorkPlace().getWpIdx() : null)
                .wsdWorkPlaceName(schedule != null && schedule.getWorkPlace() != null ? schedule.getWorkPlace().getWpName() : null)
                .wsdIsConfirmed(schedule != null && schedule.getWsdIsConfirmed())
                .wsdIsOpen(schedule != null && schedule.getWsdIsOpen())
                .wsdIsClose(schedule != null && Boolean.TRUE.equals(schedule.getWsdIsClose()))
                .wsdRemarks(waRemarks)
                .wsdCreatedAt(schedule != null ? schedule.getWsdCreatedAt() : null)
                .wsdUpdatedAt(schedule != null ? schedule.getWsdUpdatedAt() : null)

                .isSelfApplied(apply != null)
                .openApplied(apply != null && apply.isWadIsOpen())
                .applyWorkPlaceIdx(apply != null && apply.getWorkPlace() != null ? apply.getWorkPlace().getWpIdx() : null)
                .applyWorkPlaceName(apply != null && apply.getWorkPlace() != null ? apply.getWorkPlace().getWpName() : null)
                .build();
    }
}
