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

@Tag(name = "알바생 근무 신청 API (순수 신청 내역)", description = "알바생의 희망 근무 요일 신청 및 조회 API")
@RestController
@RequestMapping("/api/work-apply")
@RequiredArgsConstructor
public class WorkApplyController {

    private final WorkApplyWorkService workApplyWorkService;

    @Operation(summary = "근무 신청 등록", description = "알바생이 자신의 근무 희망 요일을 신청합니다.")
    @PostMapping
    public ResponseEntity<String> createWorkApply(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody WorkApplyWorkRequestDto requestDto) {
        workApplyWorkService.createWorkApply(userDetails.getUsername(), requestDto);
        return ResponseEntity.ok("근무 신청이 완료되었습니다.");
    }

    @Operation(summary = "근무 신청 내역 조회", description = "알바생 본인의 신청 내역을 조회합니다. 날짜(?waDate=YYYY-MM-DD)를 제공하면 해당 주차만 조회합니다.")
    @GetMapping
    public ResponseEntity<List<WorkApplyWorkResponseDto>> getWorkApplies(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate waDate) {
        return ResponseEntity.ok(workApplyWorkService.getWorkApplies(userDetails.getUsername(), waDate));
    }

    @Operation(summary = "근무 신청 상세 단건 조회", description = "신청 식별자(waIdx)를 통해 신청 내역을 단건 조회합니다.")
    @GetMapping("/{waIdx}")
    public ResponseEntity<WorkApplyWorkResponseDto> getWorkApplyById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long waIdx) {
        return ResponseEntity.ok(workApplyWorkService.getWorkApplyById(userDetails.getUsername(), waIdx));
    }

    @Operation(summary = "근무 신청 내역 수정", description = "신청 식별자(waIdx)를 통해 신청 내역을 수정합니다.")
    @PutMapping("/{waIdx}")
    public ResponseEntity<String> updateWorkApply(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long waIdx,
            @RequestBody WorkApplyWorkRequestDto requestDto) {
        workApplyWorkService.updateWorkApply(userDetails.getUsername(), waIdx, requestDto);
        return ResponseEntity.ok("근무 신청이 수정되었습니다.");
    }

    @Operation(summary = "근무 신청 내역 삭제", description = "신청 식별자(waIdx)를 통해 신청 내역을 삭제합니다.")
    @DeleteMapping("/{waIdx}")
    public ResponseEntity<String> deleteWorkApply(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long waIdx) {
        workApplyWorkService.deleteWorkApply(userDetails.getUsername(), waIdx);
        return ResponseEntity.ok("근무 신청이 삭제되었습니다.");
    }
}
