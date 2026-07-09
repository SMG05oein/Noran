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
    WorkApplyWorkResponseDto getWorkApplyWorkById(String requesterId, Long wawIdx);
    void updateWorkApplyWork(String requesterId, Long wawIdx, WorkApplyWorkRequestDto requestDto);
    void deleteWorkApplyWork(String requesterId, Long wawIdx);
    
    Map<String, Integer> getCalendarAssignmentCounts(String requesterId, int year, int month, Long workPlaceIdx);
    
    List<com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto> getDailySchedule(String requesterId, LocalDate date, Long workPlaceIdx);
}
