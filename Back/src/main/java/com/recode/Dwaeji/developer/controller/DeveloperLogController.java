package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.dto.LogResponseDto;
import com.recode.Dwaeji.developer.service.DeveloperLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dev/logs")
@RequiredArgsConstructor
public class DeveloperLogController {

    private final DeveloperLogService developerLogService;

    @GetMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<LogResponseDto> getLogs(@RequestParam(defaultValue = "200") int lines) {
        LogResponseDto response = developerLogService.getRecentLogs(lines);
        return ResponseEntity.ok(response);
    }
}
