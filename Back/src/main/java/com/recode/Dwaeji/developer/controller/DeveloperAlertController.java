package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.service.DevAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dev/alerts")
@RequiredArgsConstructor
public class DeveloperAlertController {

    private final DevAlertService alertService;

    @GetMapping("/config")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> config() {
        return ResponseEntity.ok(alertService.configPublic());
    }

    @PostMapping("/test")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> test() {
        return ResponseEntity.ok(alertService.sendTest());
    }
}
