package com.recode.Dwaeji.work_apply_work.service;

import com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkScheduleDailyRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkScheduleDailyResponseDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkApplyDailyRequestDto;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface WorkScheduleDailyService {
    // 관리자 배정 API
    void createSchedule(String requesterId, java.time.LocalDate startDate, java.time.LocalDate endDate, Long workPlaceIdx, List<WorkScheduleDailyRequestDto> requestDtos);
    List<WorkScheduleDailyResponseDto> getDailySchedules(String requesterId, Long workPlaceIdx, LocalDate startDate, LocalDate endDate);
    List<DailyScheduleDto> getDayAssignments(String requesterId, LocalDate date, Long workPlaceIdx);

    List<WorkScheduleDailyResponseDto> getMonthlySchedules(String requesterId, int year, int month);
    Map<String, Integer> getCalendarAssignmentCounts(String requesterId, int year, int month, Long workPlaceIdx);
    
    // 알바생 신청 API
    void createApply(String requesterId, java.time.LocalDate startDate, java.time.LocalDate endDate, List<WorkApplyDailyRequestDto> requestDtos);
}
