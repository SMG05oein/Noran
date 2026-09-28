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

    @Override
    public void addCorsMappings(org.springframework.web.servlet.config.annotation.CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "https://dwaeji.kr", 
                    "https://www.dwaeji.kr"
                    // 만약 Netlify 배포 주소가 따로 있다면 여기에 추가해 주세요. (예: "https://my-app.netlify.app")
                )
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true) // ★ 쿠키(인증 정보) 교환을 위해 필수
                .maxAge(3600);
    }
}
