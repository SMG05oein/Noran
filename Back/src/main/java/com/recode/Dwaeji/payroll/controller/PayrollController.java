package com.recode.Dwaeji.payroll.controller;

import com.recode.Dwaeji.payroll.dto.PayrollRowDto;
import com.recode.Dwaeji.payroll.service.PayrollService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "급여관리 API", description = "월별 근무기록 집계 기반 세전급여 목록·엑셀 다운로드")
@RestController
@RequestMapping("/api/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService payrollService;

    @Operation(summary = "급여 목록 조회", description = "해당 연·월 근무기록을 유저별로 합산합니다. 세전=floor(시급×총근무시간). 관리자 전용.")
    @GetMapping
    public ResponseEntity<Page<PayrollRowDto>> getPayrollList(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) Long workPlaceIdx,
            @RequestParam(required = false) String userName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "userName") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(payrollService.getPayrollList(
                userDetails.getUsername(), year, month, workPlaceIdx, userName, page, size, sortBy, sortDir));
    }

    @Operation(summary = "급여 엑셀 다운로드", description = "이름/세전/빈칸. workPlaceIdx 없으면 근무지별 Sheet. utCanExportExcel 필요.")
    @GetMapping("/excel")
    public ResponseEntity<byte[]> downloadExcel(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) Long workPlaceIdx) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        byte[] excelBytes = payrollService.downloadExcel(
                userDetails.getUsername(), year, month, workPlaceIdx);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "payroll_" + year + "_" + month + ".xlsx");

        return ResponseEntity.ok()
                .headers(headers)
                .body(excelBytes);
    }
}
