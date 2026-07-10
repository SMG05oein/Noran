package com.recode.Dwaeji.common.config;

import com.recode.Dwaeji.common.interceptor.TrafficMonitorInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final TrafficMonitorInterceptor trafficMonitorInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(trafficMonitorInterceptor)
                .addPathPatterns("/api/**"); // Only monitor API traffic
    }
}
