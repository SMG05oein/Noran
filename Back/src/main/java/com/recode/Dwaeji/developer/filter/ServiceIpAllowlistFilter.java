package com.recode.Dwaeji.developer.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recode.Dwaeji.developer.service.DevIpAccessService;
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
import java.util.Map;

/**
 * Blocks IPs on the SERVICE block list from the attendance service (everything except /api/dev/**).
 * Empty list = nobody blocked. Loopback and DEV IPs can never be blocked.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 30)
public class ServiceIpAllowlistFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ServiceIpAllowlistFilter.class);

    private final DevIpAccessService ipAccessService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ServiceIpAllowlistFilter(DevIpAccessService ipAccessService) {
        this.ipAccessService = ipAccessService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        if (path != null && path.startsWith("/api/dev/")) {
            return true; // handled by DevIpAllowlistFilter
        }
        return !ipAccessService.hasServiceBlocklist();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String clientIp = DevIpAllowlistFilter.resolveClientIp(request);
        if (ipAccessService.isServiceAccessAllowed(clientIp)) {
            chain.doFilter(request, response);
            return;
        }
        log.warn("[SERVICE IP] blocked {} {} from {}", request.getMethod(), request.getRequestURI(), clientIp);
        // 418 I'm a teapot
        response.setStatus(418);
        // 이 필터는 CORS 필터보다 먼저 실행되므로, 프론트가 418 응답을 읽을 수 있게 Origin을 그대로 허용한다.
        // (자격증명 미허용, 차단 응답에만 적용)
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.addHeader("Vary", "Origin");
        }
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                "code", "SERVICE_IP_BLOCKED",
                "status", 418,
                "message", "I'm a teapot. 접근이 차단된 IP입니다.")));
    }
}
