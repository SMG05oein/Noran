package com.recode.Dwaeji.user.controller;

import com.recode.Dwaeji.user.dto.BankDto;
import com.recode.Dwaeji.user.repository.BankRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "은행 API")
@RestController
@RequestMapping("/api/banks")
@RequiredArgsConstructor
public class BankController {

    private final BankRepository bankRepository;

    @Operation(summary = "활성 은행 목록")
    @GetMapping
    public ResponseEntity<List<BankDto>> listActiveBanks() {
        List<BankDto> list = bankRepository.findByIsActiveOrderBySortOrderAscBankNameAsc(1).stream()
                .map(BankDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }
}
