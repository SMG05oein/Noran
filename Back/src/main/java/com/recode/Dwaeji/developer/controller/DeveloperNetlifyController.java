package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.dto.DevAuthBodyDto;
import com.recode.Dwaeji.developer.service.NetlifyDeployService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dev/netlify")
@RequiredArgsConstructor
public class DeveloperNetlifyController {

    private final NetlifyDeployService netlifyDeployService;

    private static String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<?> status() {
        if (!netlifyDeployService.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("configured", false, "message", "Netlify token/site-id not configured"));
        }
        return ResponseEntity.ok(netlifyDeployService.status());
    }

    @GetMapping("/deploys")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<?> deploys(@RequestParam(defaultValue = "15") int perPage) {
        if (!netlifyDeployService.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("configured", false, "message", "Netlify token/site-id not configured"));
        }
        List<Map<String, Object>> list = netlifyDeployService.listDeploys(perPage);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/deploy")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<?> deploy(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails user,
            HttpServletRequest request) {
        if (netlifyDeployService.buildHookMissing()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("configured", false, "message", "netlify.build-hook-url not configured"));
        }
        DevAuthBodyDto auth = new DevAuthBodyDto(
                body.get("id") != null ? body.get("id").toString() : null,
                body.get("pw") != null ? body.get("pw").toString() : null
        );
        Boolean clearCache = body.get("clearCache") instanceof Boolean b && b;
        String actor = user != null ? user.getUsername() : "unknown";
        return ResponseEntity.ok(netlifyDeployService.triggerDeploy(auth, clearCache, actor, clientIp(request)));
    }

    @PostMapping("/rollback")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<?> rollback(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails user,
            HttpServletRequest request) {
        if (!netlifyDeployService.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("configured", false, "message", "Netlify token/site-id not configured"));
        }
        DevAuthBodyDto auth = new DevAuthBodyDto(
                body.get("id") != null ? body.get("id").toString() : null,
                body.get("pw") != null ? body.get("pw").toString() : null
        );
        String deployId = body.get("deployId") != null ? body.get("deployId").toString() : null;
        String actor = user != null ? user.getUsername() : "unknown";
        return ResponseEntity.ok(netlifyDeployService.rollback(auth, deployId, actor, clientIp(request)));
    }
}
