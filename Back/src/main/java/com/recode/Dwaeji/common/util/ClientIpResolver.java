package com.recode.Dwaeji.common.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 클라이언트 IP 해석. X-Forwarded-For / X-Real-IP 는
 * 신뢰할 수 있는 프록시(remoteAddr)에서 온 요청에만 사용한다.
 * 그 외는 remoteAddr만 사용해 헤더 스푸핑을 막는다.
 */
@Component
public class ClientIpResolver {

    private final Set<String> trustedProxies;

    public ClientIpResolver(
            @Value("${app.trusted-proxies:127.0.0.1,::1,0:0:0:0:0:0:0:1}") String trustedProxiesCsv) {
        this.trustedProxies = Arrays.stream(trustedProxiesCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    public String resolve(HttpServletRequest request) {
        String remote = normalize(request.getRemoteAddr());
        if (!isTrustedProxy(remote)) {
            return remote;
        }
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // 프록시가 추가한 체인에서 가장 왼쪽(원 클라이언트)만 사용
            return normalize(xff.split(",")[0].trim());
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return normalize(realIp.trim());
        }
        return remote;
    }

    private boolean isTrustedProxy(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }
        if (trustedProxies.contains(ip)) {
            return true;
        }
        // IPv6 루프백 표기 통일
        return "::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip);
    }

    private static String normalize(String ip) {
        if (ip == null) {
            return "";
        }
        if ("0:0:0:0:0:0:0:1".equals(ip)) {
            return "::1";
        }
        return ip;
    }
}
