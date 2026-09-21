package com.recode.Dwaeji.work_apply_work.controller;

import com.recode.Dwaeji.work_apply_work.dto.WorkApplyDailyRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkScheduleDailyRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkScheduleDailyResponseDto;
import com.recode.Dwaeji.work_apply_work.service.WorkScheduleDailyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Tag(name = "근무 일정(일 단위) API", description = "복수 근무지를 지원하는 일 단위 근무 일정 API")
@RestController
@RequestMapping("/api/work-schedule")
@RequiredArgsConstructor
public class WorkScheduleDailyController {

    private final WorkScheduleDailyService scheduleService;

    @Operation(summary = "알바생 근무 신청 생성 (일 단위)", description = "알바생이 일자별 신청 내역을 생성합니다.")
    @PostMapping("/apply")
    public ResponseEntity<String> createApply(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestBody List<WorkApplyDailyRequestDto> requestDtos) {
        scheduleService.createApply(userDetails.getUsername(), startDate, endDate, requestDtos);
        return ResponseEntity.ok("근무 신청이 완료되었습니다.");
    }

    @Operation(summary = "관리자 배정 확정 생성 (일 단위)", description = "관리자가 일자별 배정 내역을 생성합니다.")
    @PostMapping("/schedule")
    public ResponseEntity<String> createSchedule(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam Long workPlaceIdx,
            @RequestBody List<WorkScheduleDailyRequestDto> requestDtos) {
        scheduleService.createSchedule(userDetails.getUsername(), startDate, endDate, workPlaceIdx, requestDtos);
        return ResponseEntity.ok("배정이 완료되었습니다.");
    }

    @Operation(summary = "월간 배정 리스트 조회 (알바생 캘린더용)")
    @GetMapping("/monthly")
    public ResponseEntity<List<WorkScheduleDailyResponseDto>> getMonthlySchedules(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(scheduleService.getMonthlySchedules(userDetails.getUsername(), year, month));
    }

    @Operation(summary = "주간 배정표 조회 (관리자용)")
    @GetMapping("/weekly")
    public ResponseEntity<List<WorkScheduleDailyResponseDto>> getDailySchedules(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long workPlaceIdx,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (date != null) {
            startDate = date.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
            endDate = startDate.plusDays(6);
        }
        
        return ResponseEntity.ok(scheduleService.getDailySchedules(userDetails.getUsername(), workPlaceIdx, startDate, endDate));
    }

    @Operation(summary = "일별 출근 명단 조회 (관리자용)", description = "선택한 날짜·지점의 확정된 출근 인원을 반환합니다.")
    @GetMapping("/daily")
    public ResponseEntity<List<com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto>> getDayAssignments(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long workPlaceIdx) {
        return ResponseEntity.ok(scheduleService.getDayAssignments(userDetails.getUsername(), date, workPlaceIdx));
    }



    @Operation(summary = "캘린더 월간 배정 인원 조회")
    @GetMapping("/calendar-counts")
    public ResponseEntity<Map<String, Integer>> getCalendarCounts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) Long workPlaceIdx) {
        return ResponseEntity.ok(scheduleService.getCalendarAssignmentCounts(userDetails.getUsername(), year, month, workPlaceIdx));
    }
}
