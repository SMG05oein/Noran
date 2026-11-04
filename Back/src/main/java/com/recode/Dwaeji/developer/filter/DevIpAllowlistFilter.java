package com.recode.Dwaeji.developer.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recode.Dwaeji.common.util.ClientIpResolver;
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
 * 개발자 대시보드 API를 IP 허용 목록(또는 짧은 OTP 세션)으로 제한한다.
 * 로그인은 제외 — 자격 증명 후 {@code DeveloperAuthService}에서 IP를 검사한다.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class DevIpAllowlistFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(DevIpAllowlistFilter.class);

    private final DevIpAccessService ipAccessService;
    private final ClientIpResolver clientIpResolver;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DevIpAllowlistFilter(DevIpAccessService ipAccessService, ClientIpResolver clientIpResolver) {
        this.ipAccessService = ipAccessService;
        this.clientIpResolver = clientIpResolver;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // CORS preflight는 IP 검사 전에 통과
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
        String clientIp = clientIpResolver.resolve(request);
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
}
