package com.recode.Dwaeji.work_apply_work.service;

import com.recode.Dwaeji.work_apply_work.database.AssignMode;
import com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkApplyDailyRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkScheduleDailyRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkScheduleDailyResponseDto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface WorkScheduleDailyService {
    // 관리자 배정 API
    /** @return 실제 적용된 AssignMode (응답 메시지용) */
    AssignMode createSchedule(String requesterId, java.time.LocalDate startDate, java.time.LocalDate endDate, Long workPlaceIdx, List<WorkScheduleDailyRequestDto> requestDtos, String assignMode, boolean confirmedFallback);
    List<WorkScheduleDailyResponseDto> getDailySchedules(String requesterId, Long workPlaceIdx, LocalDate startDate, LocalDate endDate);
    List<DailyScheduleDto> getDayAssignments(String requesterId, LocalDate date, Long workPlaceIdx);

    List<WorkScheduleDailyResponseDto> getMonthlySchedules(String requesterId, int year, int month);
    /** 날짜별 총 출근 / 피크 인원. value = { total, peak } */
    Map<String, Map<String, Integer>> getCalendarAssignmentCounts(String requesterId, LocalDate startDate, LocalDate endDate, Long workPlaceIdx);
    
    // 알바생 신청 API
    /** 최초 신청만. 해당 주에 이미 신청이 있으면 400. */
    void createApply(String requesterId, java.time.LocalDate startDate, java.time.LocalDate endDate, List<WorkApplyDailyRequestDto> requestDtos);
    /** 기존 주 신청 수정. 없으면 404. */
    void updateApply(String requesterId, java.time.LocalDate startDate, java.time.LocalDate endDate, List<WorkApplyDailyRequestDto> requestDtos);
}
