package com.recode.Dwaeji.work_apply_work.service;

import com.recode.Dwaeji.work_apply_work.dto.WorkApplyWorkRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkApplyWorkResponseDto;

import org.springframework.data.domain.Page;
import java.util.List;

import java.time.LocalDate;
import java.util.Map;

public interface WorkApplyWorkService {
    void createWorkApplyWork(String requesterId, WorkApplyWorkRequestDto requestDto);
    List<WorkApplyWorkResponseDto> getAllWorkApplyWorks(String requesterId, Long workPlaceIdx, LocalDate wawDate);
    List<WorkApplyWorkResponseDto> getMonthlyWorkApplyWorks(String requesterId, int year, int month);
    WorkApplyWorkResponseDto getWorkApplyWorkById(String requesterId, Long wawIdx);
    void updateWorkApplyWork(String requesterId, Long wawIdx, WorkApplyWorkRequestDto requestDto);
    void deleteWorkApplyWork(String requesterId, Long wawIdx);
    
    Map<String, Integer> getCalendarAssignmentCounts(String requesterId, int year, int month, Long workPlaceIdx);
    
    List<com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto> getDailySchedule(String requesterId, LocalDate date, Long workPlaceIdx);

    // --- 알바생 근무 신청 (WorkApply) API ---
    void createWorkApply(String requesterId, WorkApplyWorkRequestDto requestDto);
    List<WorkApplyWorkResponseDto> getWorkApplies(String requesterId, LocalDate waDate);
    WorkApplyWorkResponseDto getWorkApplyById(String requesterId, Long waIdx);
    void updateWorkApply(String requesterId, Long waIdx, WorkApplyWorkRequestDto requestDto);
    void deleteWorkApply(String requesterId, Long waIdx);
}
