package com.recode.Dwaeji.developer.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Shared IP allowlist + OTP session gate for /api/dev/**.
 */
@Service
public class DevIpAccessService {

    private final Set<String> allowedIps;
    private final DevIpOtpService ipOtpService;

    public DevIpAccessService(
            @Value("${dev.allowed-ips:}") String allowedIpsCsv,
            DevIpOtpService ipOtpService) {
        this.allowedIps = Arrays.stream(allowedIpsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
        this.ipOtpService = ipOtpService;
    }

    public boolean isAllowlistEmpty() {
        return allowedIps.isEmpty();
    }

    public boolean isAccessGranted(String clientIp, String ipTokenHeader) {
        if (isAllowlistEmpty()) {
            return true;
        }
        if (isAllowedIp(clientIp)) {
            return true;
        }
        return ipOtpService.isSessionValid(ipTokenHeader, clientIp);
    }

    public boolean isAllowedIp(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return false;
        }
        if (allowedIps.contains(clientIp)) {
            return true;
        }
        // IPv6 loopback ↔ 127.0.0.1
        if ("::1".equals(clientIp) || "0:0:0:0:0:0:0:1".equals(clientIp)) {
            return allowedIps.contains("127.0.0.1");
        }
        if ("127.0.0.1".equals(clientIp)) {
            return allowedIps.contains("::1");
        }
        return false;
    }

    public Map<String, Object> otpRequiredBody() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", "허용되지 않은 IP입니다. 이메일 인증이 필요합니다.");
        body.put("code", "DEV_IP_OTP_REQUIRED");
        body.put("requestOtp", "POST /api/dev/auth/ip-otp/request");
        body.put("verifyOtp", "POST /api/dev/auth/ip-otp/verify");
        return body;
    }
}
