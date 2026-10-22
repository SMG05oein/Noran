package com.recode.Dwaeji.common.interceptor;

import com.recode.Dwaeji.common.util.ClientPageResolver;
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

    private final java.util.concurrent.ConcurrentHashMap<String, long[]> requestCounts = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String uri = request.getRequestURI();
        if (uri != null && uri.startsWith("/api/dev/")) {
            return true;
        }

        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isEmpty() || "unknown".equalsIgnoreCase(clientIp)) {
            clientIp = request.getRemoteAddr();
        }

        long currentSecond = System.currentTimeMillis() / 1000;
        long[] countData = requestCounts.computeIfAbsent(clientIp, k -> new long[]{currentSecond, 0});

        synchronized (countData) {
            if (countData[0] != currentSecond) {
                countData[0] = currentSecond;
                countData[1] = 0;

                // 가끔씩 메모리 확보용 정리 (10000개 IP 초과시)
                if (requestCounts.size() > 10000) {
                    requestCounts.clear();
                }
            }
            countData[1]++;
            if (countData[1] > 10) { // 1초에 10번 초과 시 차단
                response.setStatus(429);
                response.getWriter().write("Too Many Requests");
                systemMonitorService.recordTraffic(429);
                return false;
            }
        }

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

            String referer = ClientPageResolver.resolve(request);

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
