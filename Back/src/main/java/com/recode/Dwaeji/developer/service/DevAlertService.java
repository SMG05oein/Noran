package com.recode.Dwaeji.developer.service;

import com.recode.Dwaeji.developer.dto.DevAuthBodyDto;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class DevAlertService {

    private static final Logger log = LoggerFactory.getLogger(DevAlertService.class);

    private final SystemMonitorService systemMonitorService;
    private final DeveloperDashboardService dashboardService;
    private final DevExecutorAuth executorAuth;
    private final RestClient.Builder restClientBuilder;
    private final ConcurrentHashMap<String, Instant> lastSent = new ConcurrentHashMap<>();
    @Value("${alert.webhook.url:}")
    private String webhookUrl;
    @Value("${alert.memory.used-percent-threshold:85}")
    private double memoryThreshold;
    @Value("${alert.disk.free-percent-threshold:15}")
    private double diskFreeThreshold;
    @Value("${alert.server-error.delta-threshold:20}")
    private long serverErrorDeltaThreshold;
    @Value("${alert.cooldown-ms:300000}")
    private long cooldownMs;
    private long lastServerErrorSnapshot = 0;

    public Map<String, Object> configPublic() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabled", webhookUrl != null && !webhookUrl.isBlank());
        m.put("memoryUsedPercentThreshold", memoryThreshold);
        m.put("diskFreePercentThreshold", diskFreeThreshold);
        m.put("serverErrorDeltaThreshold", serverErrorDeltaThreshold);
        m.put("cooldownMs", cooldownMs);
        return m;
    }

    public void sendTest(DevAuthBodyDto body) {
        executorAuth.require(body.getId(), body.getPw());
        if (webhookUrl == null || webhookUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "alert.webhook.url not configured");
        }
        try {
            postWebhook("🧪 Dev dashboard test alert from " + dashboardService.buildVersion().get("appName"));
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, e.getMessage());
        }
    }

    @Scheduled(fixedDelayString = "${alert.check-ms:60000}")
    public void checkThresholds() {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return;
        }
        try {
            double mem = systemMonitorService.memoryUsedPercent();
            if (mem >= memoryThreshold) {
                maybeAlert("memory", String.format("⚠️ Memory used %.1f%% (threshold %.0f%%)", mem, memoryThreshold));
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> disk = (Map<String, Object>) dashboardService.buildHealth().get("disk");
            if (disk != null && disk.get("freePercent") instanceof Number fp) {
                double free = fp.doubleValue();
                if (free <= diskFreeThreshold) {
                    maybeAlert("disk", String.format("⚠️ Disk free %.1f%% (threshold %.0f%%)", free, diskFreeThreshold));
                }
            }

            long nowErrors = systemMonitorService.getServerErrorCount();
            long delta = nowErrors - lastServerErrorSnapshot;
            lastServerErrorSnapshot = nowErrors;
            if (delta >= serverErrorDeltaThreshold) {
                maybeAlert("server-error", String.format("⚠️ Server errors +%d in last check window (threshold %d)", delta, serverErrorDeltaThreshold));
            }
        } catch (Exception e) {
            log.debug("Alert check failed: {}", e.getMessage());
        }
    }

    private void maybeAlert(String key, String content) {
        Instant last = lastSent.get(key);
        Instant now = Instant.now();
        if (last != null && now.toEpochMilli() - last.toEpochMilli() < cooldownMs) {
            return;
        }
        postWebhook(content);
        lastSent.put(key, now);
    }

    private void postWebhook(String content) {
        try {
            Map<String, String> payload = Map.of("content", content, "text", content);
            restClientBuilder.build()
                    .post()
                    .uri(webhookUrl)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Webhook post failed: {}", e.getMessage());
            throw new IllegalStateException("Webhook failed: " + e.getMessage(), e);
        }
    }
}
