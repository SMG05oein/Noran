package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.dto.LogResponseDto;
import com.recode.Dwaeji.developer.service.DeveloperLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dev/logs")
@RequiredArgsConstructor
public class DeveloperLogController {

    private final DeveloperLogService developerLogService;

    @GetMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<LogResponseDto> getLogs(
            @RequestParam(defaultValue = "200") int lines,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(developerLogService.getRecentLogs(lines, level, keyword));
    }

    @GetMapping("/download")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<byte[]> downloadLogs(
            @RequestParam(defaultValue = "2000") int lines,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String keyword) {
        LogResponseDto res = developerLogService.getRecentLogs(lines, level, keyword);
        if (!Boolean.TRUE.equals(res.getAvailable())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, res.getMessage());
        }
        String body = res.getLogs() == null ? "" : res.getLogs().stream().collect(Collectors.joining("\n"));
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=app-logs.txt")
                .contentType(new MediaType("text", "plain", StandardCharsets.UTF_8))
                .body(bytes);
    }
}
