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

    @Operation(summary = "알바생 근무 신청 생성 (일 단위)", description = "최초 신청만 허용. 해당 주에 이미 신청이 있으면 400.")
    @PostMapping("/apply")
    public ResponseEntity<String> createApply(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestBody List<WorkApplyDailyRequestDto> requestDtos) {
        scheduleService.createApply(userDetails.getUsername(), startDate, endDate, requestDtos);
        return ResponseEntity.ok("근무 신청이 완료되었습니다.");
    }

    @Operation(summary = "알바생 근무 신청 수정 (일 단위)", description = "이미 신청한 주의 내역을 수정합니다. 없으면 404.")
    @PutMapping("/apply")
    public ResponseEntity<String> updateApply(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestBody List<WorkApplyDailyRequestDto> requestDtos) {
        scheduleService.updateApply(userDetails.getUsername(), startDate, endDate, requestDtos);
        return ResponseEntity.ok("근무 신청이 수정되었습니다.");
    }

    @Operation(summary = "관리자 배정 생성 (일 단위)",
            description = "assignMode=DRAFT|PARTIAL|CONFIRM. 없으면 confirmed로 폴백(true→CONFIRM, false→DRAFT). "
                    + "DRAFT=임시저장(미공개), PARTIAL=일부 출근만 공개·신청 유지, CONFIRM=주 확정·남은 신청→미출근.")
    @PostMapping("/schedule")
    public ResponseEntity<String> createSchedule(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam Long workPlaceIdx,
            @RequestParam(required = false) String assignMode,
            @RequestParam(defaultValue = "false") boolean confirmed,
            @RequestBody List<WorkScheduleDailyRequestDto> requestDtos) {
        com.recode.Dwaeji.work_apply_work.database.AssignMode mode =
                scheduleService.createSchedule(userDetails.getUsername(), startDate, endDate, workPlaceIdx, requestDtos, assignMode, confirmed);
        String msg = switch (mode) {
            case DRAFT -> "임시 저장이 완료되었습니다.";
            case PARTIAL -> "임시 배정이 완료되었습니다.";
            case CONFIRM -> "배정이 확정되었습니다.";
        };
        return ResponseEntity.ok(msg);
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

    @Operation(summary = "일별 출근 명단 조회 (관리자용)", description = "선택한 날짜·지점의 출근 인원을 반환합니다. 임시 저장(미확정) 배정도 포함합니다.")
    @GetMapping("/daily")
    public ResponseEntity<List<com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto>> getDayAssignments(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long workPlaceIdx) {
        return ResponseEntity.ok(scheduleService.getDayAssignments(userDetails.getUsername(), date, workPlaceIdx));
    }



    @Operation(summary = "캘린더 구간 배정 인원 조회", description = "날짜별 { total: 총출근, peak: 피크(18~20, 오픈제외) }. 임시 저장(미확정) 포함.")
    @GetMapping("/calendar-counts")
    public ResponseEntity<Map<String, Map<String, Integer>>> getCalendarCounts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long workPlaceIdx) {
        return ResponseEntity.ok(scheduleService.getCalendarAssignmentCounts(userDetails.getUsername(), startDate, endDate, workPlaceIdx));
    }
}
