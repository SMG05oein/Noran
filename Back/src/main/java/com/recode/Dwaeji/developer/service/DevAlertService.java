package com.recode.Dwaeji.developer.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Host threshold alerts via email (primary) and optional webhook.
 */
@Service
@RequiredArgsConstructor
public class DevAlertService {

    private static final Logger log = LoggerFactory.getLogger(DevAlertService.class);

    private final SystemMonitorService systemMonitorService;
    private final DeveloperDashboardService dashboardService;
    private final JavaMailSender mailSender;
    private final RestClient.Builder restClientBuilder;
    private final ConcurrentHashMap<String, Instant> lastSent = new ConcurrentHashMap<>();

    @Value("${spring.mail.username:}")
    private String mailFrom;
    @Value("${dev.ip-otp.to:}")
    private String mailToOverride;
    @Value("${alert.email.to:}")
    private String alertMailTo;
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
        String to = resolveTo();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabled", isEmailConfigured() || isWebhookConfigured());
        m.put("emailEnabled", isEmailConfigured());
        m.put("webhookEnabled", isWebhookConfigured());
        m.put("channel", isEmailConfigured() ? "email" : (isWebhookConfigured() ? "webhook" : "none"));
        m.put("toMasked", maskEmail(to));
        m.put("memoryUsedPercentThreshold", memoryThreshold);
        m.put("diskFreePercentThreshold", diskFreeThreshold);
        m.put("serverErrorDeltaThreshold", serverErrorDeltaThreshold);
        m.put("cooldownMs", cooldownMs);
        Instant lastAny = lastSent.values().stream().max(Instant::compareTo).orElse(null);
        m.put("lastSentAt", lastAny != null ? lastAny.toString() : null);
        Map<String, String> byType = new LinkedHashMap<>();
        lastSent.forEach((k, v) -> byType.put(k, v.toString()));
        m.put("lastSentByType", byType);
        return m;
    }

    /** Developer JWT만으로 테스트 발송 (Executor 불필요). */
    public Map<String, Object> sendTest() {
        if (!isEmailConfigured() && !isWebhookConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "알림 채널이 없습니다. spring.mail.username(및 수신) 또는 ALERT_WEBHOOK_URL을 설정하세요.");
        }
        String app = String.valueOf(dashboardService.buildVersion().get("appName"));
        Instant now = Instant.now();
        String subject = "[노란돼지] 운영 콘솔 테스트 알림";
        String body = "운영 콘솔에서 보낸 테스트 알림입니다.\n앱: " + app + "\n시각: " + now;
        dispatch("test", subject, body);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", true);
        result.put("message", "테스트 알림을 발송했습니다.");
        result.put("sentAt", now.toString());
        result.put("toMasked", maskEmail(resolveTo()));
        result.put("channel", isEmailConfigured() ? "email" : "webhook");
        return result;
    }

    @Scheduled(fixedDelayString = "${alert.check-ms:60000}")
    public void checkThresholds() {
        if (!isEmailConfigured() && !isWebhookConfigured()) {
            return;
        }
        try {
            double mem = systemMonitorService.memoryUsedPercent();
            if (mem >= memoryThreshold) {
                maybeAlert("memory",
                        "[노란돼지] 메모리 경고",
                        String.format("메모리 사용률 %.1f%% (임계값 %.0f%%)", mem, memoryThreshold));
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> disk = (Map<String, Object>) dashboardService.buildHealth().get("disk");
            if (disk != null && disk.get("freePercent") instanceof Number fp) {
                double free = fp.doubleValue();
                if (free <= diskFreeThreshold) {
                    maybeAlert("disk",
                            "[노란돼지] 디스크 경고",
                            String.format("디스크 여유 %.1f%% (임계값 %.0f%% 이하)", free, diskFreeThreshold));
                }
            }

            long nowErrors = systemMonitorService.getServerErrorCount();
            long delta = nowErrors - lastServerErrorSnapshot;
            lastServerErrorSnapshot = nowErrors;
            if (delta >= serverErrorDeltaThreshold) {
                maybeAlert("server-error",
                        "[노란돼지] 서버 오류 급증",
                        String.format("최근 점검 구간 5xx +%d건 (임계값 %d)", delta, serverErrorDeltaThreshold));
            }
        } catch (Exception e) {
            log.debug("Alert check failed: {}", e.getMessage());
        }
    }

    private void maybeAlert(String key, String subject, String content) {
        Instant last = lastSent.get(key);
        Instant now = Instant.now();
        if (last != null && now.toEpochMilli() - last.toEpochMilli() < cooldownMs) {
            return;
        }
        dispatch(key, subject, content);
    }

    private void dispatch(String key, String subject, String content) {
        boolean any = false;
        if (isEmailConfigured()) {
            sendEmail(subject, content);
            any = true;
        }
        if (isWebhookConfigured()) {
            postWebhook(content);
            any = true;
        }
        if (!any) {
            throw new IllegalStateException("No alert channel configured");
        }
        lastSent.put(key, Instant.now());
        log.info("[DEV ALERT] sent key={} email={} webhook={}", key, isEmailConfigured(), isWebhookConfigured());
    }

    private void sendEmail(String subject, String text) {
        String to = resolveTo();
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text + "\n", false);
            mailSender.send(message);
            log.info("[DEV ALERT] email to {}", maskEmail(to));
        } catch (Exception e) {
            log.warn("Alert email failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "이메일 발송 실패: " + e.getMessage());
        }
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
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Webhook failed: " + e.getMessage());
        }
    }

    private boolean isEmailConfigured() {
        return mailFrom != null && !mailFrom.isBlank()
                && resolveTo() != null && !resolveTo().isBlank();
    }

    private boolean isWebhookConfigured() {
        return webhookUrl != null && !webhookUrl.isBlank();
    }

    private String resolveTo() {
        if (alertMailTo != null && !alertMailTo.isBlank()) {
            return alertMailTo.trim();
        }
        if (mailToOverride != null && !mailToOverride.isBlank()) {
            return mailToOverride.trim();
        }
        return mailFrom;
    }

    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) return "**" + domain;
        return local.substring(0, 2) + "***" + domain;
    }
}
