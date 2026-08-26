package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.dto.TopEndpointDto;
import com.recode.Dwaeji.developer.service.SystemMonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dev/analytics")
@RequiredArgsConstructor
public class DeveloperAnalyticsController {

    private final SystemMonitorService systemMonitorService;

    @GetMapping("/top-endpoints")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<List<TopEndpointDto>> getTopEndpoints() {
        List<TopEndpointDto> topEndpoints = systemMonitorService.getTopEndpoints();
        return ResponseEntity.ok(topEndpoints);
    }
}
