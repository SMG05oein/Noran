package com.recode.Dwaeji.developer.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recode.Dwaeji.developer.service.DevIpAccessService;
import com.recode.Dwaeji.developer.service.DevIpOtpService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Restricts developer dashboard APIs to an IP allowlist,
 * or a short-lived email-OTP session ({@link DevIpOtpService#HEADER}).
 * Login is excluded — IP is checked after credentials in {@code DeveloperAuthService}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class DevIpAllowlistFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(DevIpAllowlistFilter.class);

    private final DevIpAccessService ipAccessService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DevIpAllowlistFilter(DevIpAccessService ipAccessService) {
        this.ipAccessService = ipAccessService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // CORS preflight must pass before IP check
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        if (path == null || !path.startsWith("/api/dev/")) {
            return true;
        }
        if ("/api/dev/announcements/maintenance-status".equals(path)
                || "/api/dev/announcements/public".equals(path)
                || "/api/dev/auth/login".equals(path)
                || "/api/dev/auth/ip-otp/request".equals(path)
                || "/api/dev/auth/ip-otp/verify".equals(path)) {
            return true;
        }
        return ipAccessService.isAllowlistEmpty();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String clientIp = resolveClientIp(request);
        String token = request.getHeader(DevIpOtpService.HEADER);
        if (ipAccessService.isAccessGranted(clientIp, token)) {
            filterChain.doFilter(request, response);
            return;
        }

        log.warn("[DEV IP] blocked {} {} from {}", request.getMethod(), request.getRequestURI(), clientIp);
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(ipAccessService.otpRequiredBody()));
    }

    public static String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        String remote = request.getRemoteAddr();
        if ("::1".equals(remote) || "0:0:0:0:0:0:0:1".equals(remote)) {
            return "::1";
        }
        return remote != null ? remote : "";
    }
}
