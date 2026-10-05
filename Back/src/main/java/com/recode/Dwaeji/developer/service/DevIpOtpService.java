package com.recode.Dwaeji.developer.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * When client IP is not on the allowlist, developer APIs require email OTP
 * sent to the configured mailbox (typically MAIL_USERNAME — self mail).
 */
@Service
@RequiredArgsConstructor
public class DevIpOtpService {

    public static final String HEADER = "X-Dev-Ip-Token";

    private static final Logger log = LoggerFactory.getLogger(DevIpOtpService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JavaMailSender mailSender;
    private final ConcurrentHashMap<String, OtpEntry> otpByIp = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, SessionEntry> sessions = new ConcurrentHashMap<>();
    @Value("${spring.mail.username:}")
    private String mailFrom;
    @Value("${dev.ip-otp.to:}")
    private String mailToOverride;
    @Value("${dev.ip-otp.ttl-seconds:300}")
    private long otpTtlSeconds;
    @Value("${dev.ip-otp.session-ttl-seconds:43200}")
    private long sessionTtlSeconds;
    @Value("${dev.ip-otp.min-interval-seconds:60}")
    private long minIntervalSeconds;

    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) return "**" + domain;
        return local.substring(0, 2) + "***" + domain;
    }

    public Map<String, Object> requestOtp(String clientIp) {
        String to = resolveTo();
        if (to == null || to.isBlank() || mailFrom == null || mailFrom.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "메일 설정(spring.mail.username)이 없습니다.");
        }

        OtpEntry existing = otpByIp.get(clientIp);
        Instant now = Instant.now();
        if (existing != null && existing.lastSentAt().plusSeconds(minIntervalSeconds).isAfter(now)) {
            long wait = minIntervalSeconds - (now.getEpochSecond() - existing.lastSentAt().getEpochSecond());
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "인증번호는 " + Math.max(1, wait) + "초 후에 다시 요청할 수 있습니다.");
        }

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        otpByIp.put(clientIp, new OtpEntry(code, now.plusSeconds(otpTtlSeconds), now));

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject("[노란돼지] 개발자 대시보드 IP 인증번호");
            helper.setText(
                    "개발자 대시보드 접속 IP가 허용 목록에 없습니다.\n\n"
                            + "요청 IP: " + clientIp + "\n"
                            + "인증번호: " + code + "\n\n"
                            + "유효 시간: " + (otpTtlSeconds / 60) + "분\n"
                            + "본인이 요청하지 않았다면 무시하세요.\n",
                    false
            );
            mailSender.send(message);
            log.info("[DEV IP OTP] sent to {} for ip={}", maskEmail(to), clientIp);
        } catch (Exception e) {
            otpByIp.remove(clientIp);
            log.error("[DEV IP OTP] send failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "이메일 발송에 실패했습니다: " + e.getMessage());
        }

        return Map.of(
                "sent", true,
                "toMasked", maskEmail(to),
                "expiresInSeconds", otpTtlSeconds,
                "message", "인증번호를 이메일로 보냈습니다."
        );
    }

    public Map<String, Object> verifyOtp(String clientIp, String code) {
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증번호를 입력해주세요.");
        }
        OtpEntry entry = otpByIp.get(clientIp);
        if (entry == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증번호를 먼저 요청해주세요.");
        }
        if (Instant.now().isAfter(entry.expiresAt())) {
            otpByIp.remove(clientIp);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증번호가 만료되었습니다. 다시 요청해주세요.");
        }
        if (!entry.code().equals(code.trim())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증번호가 일치하지 않습니다.");
        }

        otpByIp.remove(clientIp);
        String token = UUID.randomUUID().toString().replace("-", "");
        Instant exp = Instant.now().plusSeconds(sessionTtlSeconds);
        sessions.put(token, new SessionEntry(clientIp, exp));
        cleanupExpiredSessions();

        return Map.of(
                "ipToken", token,
                "expiresAt", exp.toString(),
                "expiresInSeconds", sessionTtlSeconds,
                "header", HEADER,
                "message", "IP 인증 완료. 이후 요청에 " + HEADER + " 헤더를 넣어주세요."
        );
    }

    public boolean isSessionValid(String token, String clientIp) {
        if (token == null || token.isBlank() || clientIp == null) {
            return false;
        }
        SessionEntry s = sessions.get(token);
        if (s == null) {
            return false;
        }
        if (Instant.now().isAfter(s.expiresAt())) {
            sessions.remove(token);
            return false;
        }
        return s.ip().equals(clientIp);
    }

    private String resolveTo() {
        if (mailToOverride != null && !mailToOverride.isBlank()) {
            return mailToOverride;
        }
        return mailFrom;
    }

    private void cleanupExpiredSessions() {
        Instant now = Instant.now();
        sessions.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt()));
    }

    private record OtpEntry(String code, Instant expiresAt, Instant lastSentAt) {
    }

    private record SessionEntry(String ip, Instant expiresAt) {
    }
}
