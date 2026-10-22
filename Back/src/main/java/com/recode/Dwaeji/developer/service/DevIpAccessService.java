package com.recode.Dwaeji.developer.service;

import com.recode.Dwaeji.developer.database.AllowedIp;
import com.recode.Dwaeji.developer.database.AllowedIpRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Shared IP allowlist + OTP session gate for /api/dev/**,
 * and the IP allowlist for the attendance service itself.
 * <ul>
 *   <li>DEV: {@code dev.allowed-ips} (read-only, from config) + DB rows of type DEV</li>
 *   <li>SERVICE: DB rows of type SERVICE = BLOCK list for the attendance service (empty = nobody blocked)</li>
 * </ul>
 */
@Service
public class DevIpAccessService {

    private static final Logger log = LoggerFactory.getLogger(DevIpAccessService.class);

    private final Set<String> configIps;
    private final DevIpOtpService ipOtpService;
    private final AllowedIpRepository allowedIpRepository;

    private volatile Set<String> dbDevIps = Set.of();
    private volatile Set<String> serviceIps = Set.of();

    public DevIpAccessService(
            @Value("${dev.allowed-ips:}") String allowedIpsCsv,
            DevIpOtpService ipOtpService,
            AllowedIpRepository allowedIpRepository) {
        this.configIps = Arrays.stream(allowedIpsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
        this.ipOtpService = ipOtpService;
        this.allowedIpRepository = allowedIpRepository;
    }

    @PostConstruct
    public void reload() {
        try {
            dbDevIps = load(AllowedIp.Type.DEV);
            serviceIps = load(AllowedIp.Type.SERVICE);
        } catch (Exception e) {
            log.error("[IP] failed to load allowed IPs from DB", e);
        }
    }

    private Set<String> load(AllowedIp.Type type) {
        return allowedIpRepository.findByIpTypeOrderByIpIdxAsc(type).stream()
                .map(AllowedIp::getIpAddress)
                .collect(Collectors.toUnmodifiableSet());
    }

    public Set<String> getConfigIps() {
        return configIps;
    }

    // ---------------- DEV ----------------

    public boolean isAllowlistEmpty() {
        return configIps.isEmpty() && dbDevIps.isEmpty();
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
        return matches(clientIp, configIps, dbDevIps);
    }

    // ---------------- SERVICE ----------------

    /** SERVICE rows are a BLOCK list for the attendance service. */
    public boolean hasServiceBlocklist() {
        return !serviceIps.isEmpty();
    }

    public boolean isProtectedFromBlock(String ip) {
        return isLoopback(ip) || isAllowedIp(ip);
    }

    /** Blocked unless listed; loopback (deploy health check) and DEV IPs can never be blocked. */
    public boolean isServiceAccessAllowed(String clientIp) {
        if (!hasServiceBlocklist()) {
            return true;
        }
        if (isProtectedFromBlock(clientIp)) {
            return true;
        }
        return !matches(clientIp, serviceIps);
    }

    // ---------------- helpers ----------------

    private static boolean isLoopback(String ip) {
        return "127.0.0.1".equals(ip) || "::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip);
    }

    @SafeVarargs
    private static boolean matches(String clientIp, Set<String>... sets) {
        if (clientIp == null || clientIp.isBlank()) {
            return false;
        }
        for (Set<String> s : sets) {
            if (s.contains(clientIp)) {
                return true;
            }
            // IPv6 loopback <-> 127.0.0.1
            if (("::1".equals(clientIp) || "0:0:0:0:0:0:0:1".equals(clientIp)) && s.contains("127.0.0.1")) {
                return true;
            }
            if ("127.0.0.1".equals(clientIp) && s.contains("::1")) {
                return true;
            }
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
