package com.recode.Dwaeji.work_apply_work.controller;

import com.recode.Dwaeji.work_apply_work.dto.WorkApplyWorkRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkApplyWorkResponseDto;
import com.recode.Dwaeji.work_apply_work.service.WorkApplyWorkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Tag(name = "근무 신청 API", description = "근무 신청(요일별) 생성, 조회, 수정, 삭제 API")
@RestController
@RequestMapping("/api/work-apply-work")
@RequiredArgsConstructor
public class WorkApplyWorkController {

    private final WorkApplyWorkService workApplyWorkService;

    @Operation(summary = "근무 신청 내역 생성", description = "새로운 근무 신청 내역을 생성합니다. 일반 유저는 본인의 신청만 가능하며, 관리자는 대리 신청이 가능합니다.")
    @PostMapping
    public ResponseEntity<String> createWorkApplyWork(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody WorkApplyWorkRequestDto requestDto) {
        workApplyWorkService.createWorkApplyWork(userDetails.getUsername(), requestDto);
        return ResponseEntity.ok("근무 신청 내역이 생성되었습니다.");
    }

    @Operation(summary = "전체 근무 신청 조회", description = "일반 유저는 본인의 신청 내역만, 관리자는 전체 내역 또는 특정 지점의 내역을 조회합니다. 미신청 알바생도 목록에 포함되어 반환됩니다.")
    @GetMapping
    public ResponseEntity<List<WorkApplyWorkResponseDto>> getAllWorkApplyWorks(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long workPlaceIdx,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate wawDate) {
        return ResponseEntity.ok(workApplyWorkService.getAllWorkApplyWorks(userDetails.getUsername(), workPlaceIdx, wawDate));
    }

    @Operation(summary = "캘린더 월간 배정 인원 조회", description = "관리자 페이지의 캘린더에서 사용하기 위해 특정 월의 일자별 배정 인원수를 반환합니다.")
    @GetMapping("/calendar")
    public ResponseEntity<Map<String, Integer>> getCalendarAssignmentCounts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) Long workPlaceIdx) {
        return ResponseEntity.ok(workApplyWorkService.getCalendarAssignmentCounts(userDetails.getUsername(), year, month, workPlaceIdx));
    }

    @Operation(summary = "일별 스케줄 조회", description = "관리자가 특정 날짜의 지점별 배정된 근무자 스케줄을 조회합니다.")
    @GetMapping("/daily")
    public ResponseEntity<List<com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto>> getDailySchedule(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long workPlaceIdx) {
        return ResponseEntity.ok(workApplyWorkService.getDailySchedule(userDetails.getUsername(), date, workPlaceIdx));
    }

    @Operation(summary = "특정 근무 신청 단건 조회", description = "ID(wawIdx)를 통해 특정 근무 신청을 조회합니다.")
    @GetMapping("/{wawIdx}")
    public ResponseEntity<WorkApplyWorkResponseDto> getWorkApplyWorkById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wawIdx) {
        return ResponseEntity.ok(workApplyWorkService.getWorkApplyWorkById(userDetails.getUsername(), wawIdx));
    }

    @Operation(summary = "근무 신청 내역 수정", description = "특정 근무 신청을 수정합니다. 관리자 권한이 없으면 본인의 내역만 수정 가능합니다.")
    @PutMapping("/{wawIdx}")
    public ResponseEntity<String> updateWorkApplyWork(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wawIdx,
            @RequestBody WorkApplyWorkRequestDto requestDto) {
        workApplyWorkService.updateWorkApplyWork(userDetails.getUsername(), wawIdx, requestDto);
        return ResponseEntity.ok("근무 신청 내역이 수정되었습니다.");
    }

    @Operation(summary = "근무 신청 내역 삭제", description = "특정 근무 신청을 삭제합니다. 관리자만 호출 가능합니다.")
    @DeleteMapping("/{wawIdx}")
    public ResponseEntity<String> deleteWorkApplyWork(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wawIdx) {
        workApplyWorkService.deleteWorkApplyWork(userDetails.getUsername(), wawIdx);
        return ResponseEntity.ok("근무 신청 내역이 삭제되었습니다.");
    }
}
