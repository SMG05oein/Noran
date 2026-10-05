package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.dto.DevAuthBodyDto;
import com.recode.Dwaeji.developer.service.DevAuditService;
import com.recode.Dwaeji.developer.service.DevExecutorAuth;
import com.recode.Dwaeji.developer.service.DeveloperDashboardService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/dev/dashboard")
@RequiredArgsConstructor
public class DeveloperDashboardController {

    private static final Logger log = LoggerFactory.getLogger(DeveloperDashboardController.class);

    private final DeveloperDashboardService dashboardService;
    private final DevExecutorAuth executorAuth;
    private final DevAuditService auditService;
    private final ConfigurableApplicationContext applicationContext;
    private final RestClient.Builder restClientBuilder;

    private static String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @GetMapping("/system-info")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        return ResponseEntity.ok(dashboardService.buildSystemInfo());
    }

    @GetMapping("/health")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> getHealth() {
        return ResponseEntity.ok(dashboardService.buildHealth());
    }

    @GetMapping("/version")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> getVersion() {
        return ResponseEntity.ok(dashboardService.buildVersion());
    }

    @GetMapping("/deploy-info")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> getDeployInfo() {
        return ResponseEntity.ok(dashboardService.deployInfo());
    }

    @GetMapping("/audit")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<List<Map<String, Object>>> getAudit(
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(auditService.list(limit, "dashboard"));
    }

    @PostMapping("/restart")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> restart(
            @RequestBody DevAuthBodyDto body,
            @AuthenticationPrincipal UserDetails user,
            HttpServletRequest request) {
        executorAuth.require(body.getId(), body.getPw());
        String actor = user != null ? user.getUsername() : "unknown";
        String ip = clientIp(request);
        log.warn("[DEV] restart requested by {} from {}", actor, ip);
        auditService.record("dashboard", actor, "restart", true, "accepted", ip);
        scheduleExit(0);
        return ResponseEntity.ok(Map.of(
                "accepted", true,
                "message", "Graceful shutdown scheduled. Process manager should restart the app."
        ));
    }

    @PostMapping("/shutdown")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> shutdown(
            @RequestBody DevAuthBodyDto body,
            @AuthenticationPrincipal UserDetails user,
            HttpServletRequest request) {
        executorAuth.require(body.getId(), body.getPw());
        String actor = user != null ? user.getUsername() : "unknown";
        String ip = clientIp(request);
        log.warn("[DEV] shutdown requested by {} from {}", actor, ip);
        auditService.record("dashboard", actor, "shutdown", true, "accepted", ip);
        scheduleExit(0);
        return ResponseEntity.ok(Map.of(
                "accepted", true,
                "message", "Graceful shutdown scheduled (no auto-restart assumed)."
        ));
    }

    @PostMapping("/redeploy")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> redeploy(
            @RequestBody DevAuthBodyDto body,
            @AuthenticationPrincipal UserDetails user,
            HttpServletRequest request) {
        executorAuth.require(body.getId(), body.getPw());
        if (!dashboardService.isRedeployConfigured()) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "BACKEND_DEPLOY_WEBHOOK_URL not configured");
        }
        String actor = user != null ? user.getUsername() : "unknown";
        String ip = clientIp(request);
        try {
            restClientBuilder.build()
                    .post()
                    .uri(dashboardService.backendDeployWebhookUrl())
                    .retrieve()
                    .toBodilessEntity();
            auditService.record("dashboard", actor, "redeploy", true, "webhook ok", ip);
            return ResponseEntity.ok(Map.of("ok", true, "message", "Backend deploy webhook triggered"));
        } catch (Exception e) {
            auditService.record("dashboard", actor, "redeploy", false, e.getMessage(), ip);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Deploy webhook failed: " + e.getMessage());
        }
    }

    private void scheduleExit(int code) {
        Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "dev-graceful-exit");
            t.setDaemon(true);
            return t;
        }).schedule(() -> {
            try {
                int exit = org.springframework.boot.SpringApplication.exit(applicationContext, () -> code);
                System.exit(exit);
            } catch (Exception e) {
                log.error("Graceful exit failed", e);
                System.exit(code);
            }
        }, 1500, TimeUnit.MILLISECONDS);
    }
}
