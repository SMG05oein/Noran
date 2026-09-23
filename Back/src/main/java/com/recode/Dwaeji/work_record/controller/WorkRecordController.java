package com.recode.Dwaeji.work_record.controller;

import com.recode.Dwaeji.work_record.dto.WorkRecordRequestDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordResponseDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordHistoryResponseDto;
import com.recode.Dwaeji.work_record.service.WorkRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;

import java.util.List;
import java.time.LocalDate;

@Tag(name = "근무 기록 API", description = "근무 기록(출퇴근) 생성, 조회, 수정, 삭제 API")
@RestController
@RequestMapping("/api/work-record")
@RequiredArgsConstructor
public class WorkRecordController {

    private final WorkRecordService workRecordService;

    @Operation(summary = "근무 기록 생성", description = "새로운 근무 기록을 생성합니다. 일반 유저는 본인의 기록만 생성 가능하며, 관리자는 대리 작성이 가능합니다.")
    @PostMapping
    public ResponseEntity<String> createWorkRecord(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody WorkRecordRequestDto requestDto) {
        workRecordService.createWorkRecord(userDetails.getUsername(), requestDto);
        return ResponseEntity.ok("근무 기록이 생성되었습니다.");
    }

    @Operation(summary = "전체 근무 기록 조회", description = "일반 유저는 본인의 기록만, 관리자는 전체 기록 또는 특정 지점/이름의 기록을 조회합니다.")
    @GetMapping
    public ResponseEntity<Page<WorkRecordResponseDto>> getAllWorkRecords(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long workPlaceIdx,
            @RequestParam(required = false) String userName,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "date") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(workRecordService.getAllWorkRecords(userDetails.getUsername(), workPlaceIdx, userName, year, month, page, size, sortBy, sortDir));
    }

    @Operation(summary = "알바생 월별 근무 기록 조회", description = "알바생(일반 유저)이 캘린더에서 특정 연/월의 본인 근무 기록을 리스트로 조회합니다.")
    @GetMapping("/monthly")
    public ResponseEntity<List<WorkRecordResponseDto>> getMonthlyWorkRecords(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(workRecordService.getMonthlyWorkRecords(userDetails.getUsername(), year, month));
    }

    @Operation(summary = "근무 기록 엑셀 다운로드", description = "특정 월(년/월)의 전체 또는 특정 지점 근무 기록을 엑셀 파일로 다운로드합니다. 관리자 전용.")
    @GetMapping("/excel")
    public ResponseEntity<byte[]> downloadExcel(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) Long workPlaceIdx) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        String requesterId = userDetails.getUsername();
        byte[] excelBytes = workRecordService.downloadExcel(requesterId, year, month, workPlaceIdx);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "work_records_" + year + "_" + month + ".xlsx");

        return ResponseEntity.ok()
                .headers(headers)
                .body(excelBytes);
    }

    @Operation(summary = "엑셀 업로드 기록 대조", description = "프론트엔드에서 파싱한 엑셀 데이터를 DB와 대조하여 일치 여부를 반환합니다.")
    @PostMapping("/excel-compare")
    public ResponseEntity<java.util.List<com.recode.Dwaeji.work_record.dto.ExcelCompareResponseDto>> compareExcelRecords(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody java.util.List<com.recode.Dwaeji.work_record.dto.ExcelCompareRequestDto> requestData) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(workRecordService.compareExcelRecords(userDetails.getUsername(), requestData));
    }

    @Operation(summary = "특정 근무 기록 단건 조회", description = "ID(wrIdx)를 통해 특정 근무 기록을 조회합니다.")
    @GetMapping("/{wrIdx}")
    public ResponseEntity<WorkRecordResponseDto> getWorkRecordById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wrIdx) {
        return ResponseEntity.ok(workRecordService.getWorkRecordById(userDetails.getUsername(), wrIdx));
    }

    @Operation(summary = "근무 기록 수정", description = "특정 근무 기록을 수정합니다. 관리자 권한이 없으면 본인의 기록만 수정 가능합니다.")
    @PutMapping("/{wrIdx}")
    public ResponseEntity<String> updateWorkRecord(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wrIdx,
            @Valid @RequestBody WorkRecordRequestDto requestDto) {
        workRecordService.updateWorkRecord(userDetails.getUsername(), wrIdx, requestDto);
        return ResponseEntity.ok("근무 기록이 수정되었습니다.");
    }

    @Operation(summary = "근무 기록 삭제", description = "특정 근무 기록을 삭제합니다. 관리자만 호출 가능합니다.")
    @DeleteMapping("/{wrIdx}")
    public ResponseEntity<String> deleteWorkRecord(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wrIdx) {
        workRecordService.deleteWorkRecord(userDetails.getUsername(), wrIdx);
        return ResponseEntity.ok("근무 기록이 삭제되었습니다.");
    }

    @Operation(summary = "삭제된 근무 기록 복구", description = "수정 이력 식별자(wrhIdx)를 통해 삭제된 근무 기록을 복구합니다. 관리자 전용.")
    @PostMapping("/history/{wrhIdx}/restore")
    public ResponseEntity<String> restoreWorkRecord(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wrhIdx) {
        workRecordService.restoreWorkRecord(userDetails.getUsername(), wrhIdx);
        return ResponseEntity.ok("삭제된 근무 기록이 복구되었습니다.");
    }

    @Operation(summary = "근무 기록 수정 이력 조회", description = "관리자가 변경한 근무 기록 수정 이력을 조회합니다. 관리자 전용. 연/월 및 키워드 검색 가능.")
    @GetMapping("/history")
    public ResponseEntity<org.springframework.data.domain.Page<WorkRecordHistoryResponseDto>> getWorkRecordHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Order.desc("wrhCreatedAt")));
        
        return ResponseEntity.ok(workRecordService.getWorkRecordHistory(userDetails.getUsername(), year, month, keyword, pageable));
    }
}
