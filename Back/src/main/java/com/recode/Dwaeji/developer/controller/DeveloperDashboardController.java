package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.service.SystemMonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dev/dashboard")
@RequiredArgsConstructor
public class DeveloperDashboardController {

    private final SystemMonitorService systemMonitorService;

    @GetMapping("/system-info")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        Map<String, Object> systemInfo = new HashMap<>();

        // JVM Memory Info
        long totalMemory = Runtime.getRuntime().totalMemory();
        long freeMemory = Runtime.getRuntime().freeMemory();
        long maxMemory = Runtime.getRuntime().maxMemory();
        long usedMemory = totalMemory - freeMemory;

        systemInfo.put("memory", Map.of(
                "total_mb", totalMemory / (1024 * 1024),
                "free_mb", freeMemory / (1024 * 1024),
                "max_mb", maxMemory / (1024 * 1024),
                "used_mb", usedMemory / (1024 * 1024)
        ));

        // OS Info
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        systemInfo.put("os", Map.of(
                "name", osBean.getName(),
                "arch", osBean.getArch(),
                "version", osBean.getVersion(),
                "processors", osBean.getAvailableProcessors()
        ));

        // Uptime Info
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        systemInfo.put("uptime", Map.of(
                "uptime_ms", uptimeMs,
                "uptime_seconds", uptimeMs / 1000
        ));

        // Traffic Stats
        systemInfo.put("traffic", systemMonitorService.getTrafficStats());

        // Recent Errors
        systemInfo.put("recent_errors", systemMonitorService.getRecentErrors());

        return ResponseEntity.ok(systemInfo);
    }
}
