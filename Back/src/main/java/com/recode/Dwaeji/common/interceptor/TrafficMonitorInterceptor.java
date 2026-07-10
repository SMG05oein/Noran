package com.recode.Dwaeji.common.interceptor;

import com.recode.Dwaeji.developer.service.SystemMonitorService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class TrafficMonitorInterceptor implements HandlerInterceptor {

    private final SystemMonitorService systemMonitorService;

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // Record the traffic with the HTTP status code
        systemMonitorService.recordTraffic(response.getStatus());
        
        // If there's an unhandled exception that bubbles up here, record it (though GlobalExceptionHandler usually catches them first)
        if (ex != null) {
            String who = "로그인 전";
            if (request.getUserPrincipal() != null) {
                who = request.getUserPrincipal().getName();
            }
            systemMonitorService.addErrorLog(
                    ex.getMessage(), 
                    ex.getClass().getSimpleName(), 
                    request.getRequestURL().toString(), 
                    request.getRequestURI(), 
                    who, 
                    response.getStatus()
            );
        }
    }
}
