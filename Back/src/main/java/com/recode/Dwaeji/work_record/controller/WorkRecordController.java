package com.recode.Dwaeji.work_record.controller;

import com.recode.Dwaeji.work_record.dto.*;
import com.recode.Dwaeji.work_record.excelcompare.ExcelCompareService;
import com.recode.Dwaeji.work_record.service.WorkRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "근무 기록 API", description = "근무 기록(출퇴근) 생성, 조회, 수정, 삭제 API")
@RestController
@RequestMapping("/api/work-record")
@RequiredArgsConstructor
public class WorkRecordController {

    private final WorkRecordService workRecordService;
    private final ExcelCompareService excelCompareService;

    @Operation(summary = "근무 기록 생성", description = "새로운 근무 기록을 생성합니다. 일반 유저는 본인의 기록만 생성 가능하며, 관리자는 대리 작성이 가능합니다.")
    @PostMapping
    public ResponseEntity<WorkRecordResponseDto> createWorkRecord(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody WorkRecordRequestDto requestDto) {
        WorkRecordResponseDto created = workRecordService.createWorkRecord(userDetails.getUsername(), requestDto);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(created);
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

    @Operation(summary = "알바생 월별 근무 기록 조회", description = "알바생(일반 유저)이 캘린더에서 특정 구간의 본인 근무 기록을 리스트로 조회합니다.")
    @GetMapping("/monthly")
    public ResponseEntity<List<WorkRecordResponseDto>> getMonthlyWorkRecords(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        return ResponseEntity.ok(workRecordService.getMonthlyWorkRecords(userDetails.getUsername(), startDate, endDate));
    }

    @Operation(summary = "근무 기록 엑셀 다운로드", description = "특정 월(년/월)의 근무 기록을 엑셀로 다운로드합니다. workPlaceIdx 없으면 근무지별 Sheet로 나눕니다. 관리자 전용.")
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

    @Operation(summary = "엑셀 대조 전용 템플릿 다운로드", description = "헤더: 날짜,이름,근무지,출근,퇴근,휴게")
    @GetMapping("/excel-compare/template")
    public ResponseEntity<byte[]> downloadCompareTemplate(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        byte[] bytes = excelCompareService.buildTemplate();
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "work_record_compare_template.xlsx");
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    @Operation(summary = "엑셀 대조 시작", description = "multipart 업로드. 컬럼 오류·동명이인·완료(phase) 반환. 관리자 전용.")
    @PostMapping(value = "/excel-compare", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExcelCompareUploadResponseDto> startExcelCompare(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") MultipartFile file,
            @RequestParam int year,
            @RequestParam int month) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        ExcelCompareUploadResponseDto body = excelCompareService.startCompare(
                userDetails.getUsername(), file, year, month);
        if ("COLUMN_ERROR".equals(body.getPhase())) {
            return ResponseEntity.badRequest().body(body);
        }
        return ResponseEntity.ok(body);
    }

    @Operation(summary = "엑셀 대조 동명이인 해소 후 비교", description = "sessionId + rowIndex→userIdx 선택 후 비교 재개")
    @PostMapping("/excel-compare/resolve")
    public ResponseEntity<ExcelCompareUploadResponseDto> resolveExcelCompare(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ExcelCompareResolveRequestDto request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(excelCompareService.resolveAndCompare(userDetails.getUsername(), request));
    }

    @Operation(summary = "엑셀 대조 결과 다운로드", description = "DONE phase 이후 sessionId로 결과 xlsx 다운로드")
    @GetMapping("/excel-compare/result")
    public ResponseEntity<byte[]> downloadExcelCompareResult(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(name = "compareId", required = false) String compareId,
            @RequestParam(name = "sessionId", required = false) String sessionId) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        String id = compareId != null ? compareId : sessionId;
        byte[] bytes = excelCompareService.downloadResult(userDetails.getUsername(), id);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "work_record_compare_result.xlsx");
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    @Operation(summary = "엑셀 대조 진행 상태 및 결과 확인", description = "sessionId를 통해 진행률과 완료 여부, 실패 여부를 반환합니다.")
    @GetMapping("/excel-compare/status/{sessionId}")
    public ResponseEntity<ExcelCompareUploadResponseDto> checkExcelCompareStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String sessionId) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(excelCompareService.checkStatus(userDetails.getUsername(), sessionId));
    }

    @Operation(summary = "엑셀 대조 단건 조회", description = "ID(wrIdx)를 통해 특정 근무 기록을 조회합니다.")
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

    @Operation(summary = "근무 기록 삭제", description = "특정 근무 기록을 삭제합니다. 관리자 또는 기록 소유자(본인)만 호출 가능하며, 삭제 시 감사 이력이 남아 관리자가 복구할 수 있습니다.")
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

    @Operation(summary = "관리자 근무기록 엑셀 업로드 전 인원 사전 검증", description = "엑셀에 포함된 유저명 목록으로 동명이인, 기존 등록 유저, 지점 지정이 필요한 신규 유저를 사전 분류합니다. 관리자 전용.")
    @PostMapping("/admin/excel-validate")
    public ResponseEntity<com.recode.Dwaeji.work_record.dto.ExcelValidateResponseDto> validateExcelUsers(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody com.recode.Dwaeji.work_record.dto.ExcelValidateRequestDto requestDto) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(workRecordService.validateExcelUsers(userDetails.getUsername(), requestDto));
    }

    @Operation(summary = "관리자 근무기록 엑셀 일괄 등록", description = "사전 검증 후 지점이 매핑된 신규 임시 유저(is_temp_user=1)를 자동 생성하고 근무기록을 일괄 등록/수정합니다. 관리자 전용.")
    @PostMapping("/admin/excel-upload")
    public ResponseEntity<com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadResponseDto> uploadWorkRecordsFromExcel(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadRequestDto requestDto) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(workRecordService.uploadWorkRecordsFromExcel(userDetails.getUsername(), requestDto));
    }
}
