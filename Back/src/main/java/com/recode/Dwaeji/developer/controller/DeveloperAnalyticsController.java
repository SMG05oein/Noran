package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.dto.TopEndpointDto;
import com.recode.Dwaeji.developer.service.SystemMonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/dev/analytics")
@RequiredArgsConstructor
public class DeveloperAnalyticsController {

    private static final Set<Integer> ALLOWED_HOURS = Set.of(1, 6, 24, 168);

    private final SystemMonitorService systemMonitorService;

    private static int normalizeHours(Integer hours) {
        if (hours == null) return 24;
        if (ALLOWED_HOURS.contains(hours)) return hours;
        return 24;
    }

    @GetMapping("/top-endpoints")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<List<TopEndpointDto>> getTopEndpoints(
            @RequestParam(required = false) Integer hours,
            @RequestParam(defaultValue = "10") int limit) {
        Integer h = normalizeHours(hours);
        // hours omitted → legacy all-time top (backward compatible)
        if (hours == null) {
            return ResponseEntity.ok(systemMonitorService.getTopEndpoints(null, limit));
        }
        return ResponseEntity.ok(systemMonitorService.getTopEndpoints(h, limit));
    }

    @GetMapping("/slow-endpoints")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<List<TopEndpointDto>> getSlowEndpoints(
            @RequestParam(defaultValue = "24") int hours,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(systemMonitorService.getSlowEndpoints(normalizeHours(hours), limit));
    }

    @GetMapping("/status-breakdown")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Long>> getStatusBreakdown(
            @RequestParam(defaultValue = "24") int hours) {
        return ResponseEntity.ok(systemMonitorService.getStatusBreakdown(normalizeHours(hours)));
    }
}
