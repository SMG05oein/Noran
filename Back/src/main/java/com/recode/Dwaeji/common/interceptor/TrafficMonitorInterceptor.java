package com.recode.Dwaeji.common.interceptor;

import com.recode.Dwaeji.developer.service.SystemMonitorService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

@Component
@RequiredArgsConstructor
public class TrafficMonitorInterceptor implements HandlerInterceptor {

    private final SystemMonitorService systemMonitorService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute("startTime", System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        String uri = request.getRequestURI();
        // 개발자 전용 대시보드 API(/api/dev/*)는 트래픽 통계 및 모니터링에서 제외
        if (uri != null && uri.startsWith("/api/dev/")) {
            return;
        }

        long startTime = request.getAttribute("startTime") != null ? (long) request.getAttribute("startTime") : System.currentTimeMillis();
        long duration = System.currentTimeMillis() - startTime;

        // Record general traffic stats
        systemMonitorService.recordTraffic(response.getStatus());

        String pattern = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String endpointPath = pattern != null ? pattern : "UNKNOWN";

        // Record detailed endpoint call metrics
        systemMonitorService.recordEndpointCall(endpointPath, request.getMethod(), duration, response.getStatus());

        // If an unhandled exception occurred, log error
        if (ex != null) {
            String who = "로그인 전";
            if (request.getUserPrincipal() != null) {
                who = request.getUserPrincipal().getName();
            }
            
            String referer = request.getHeader("Referer");
            if (referer == null || referer.isEmpty()) {
                referer = request.getHeader("Origin");
            }
            if (referer == null || referer.isEmpty()) {
                referer = "알 수 없음";
            }
            
            String clientIp = request.getHeader("X-Forwarded-For");
            if (clientIp == null || clientIp.isEmpty() || "unknown".equalsIgnoreCase(clientIp)) {
                clientIp = request.getRemoteAddr();
            }

            systemMonitorService.addErrorLog(
                    ex.getMessage(),
                    ex.getClass().getSimpleName(),
                    request.getRequestURL().toString(),
                    request.getRequestURI(),
                    who,
                    response.getStatus(),
                    referer,
                    clientIp
            );
        }
    }
}
