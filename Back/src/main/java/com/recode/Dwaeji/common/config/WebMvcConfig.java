package com.recode.Dwaeji.common.config;

import com.recode.Dwaeji.common.interceptor.TrafficMonitorInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.http.CacheControl;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.TimeUnit;

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
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 1. index.html은 절대 캐싱하지 않음 (항상 최신 JS 해시값을 읽어야 함)
        registry.addResourceHandler("/index.html", "/")
                .addResourceLocations("classpath:/static/")
                .setCacheControl(CacheControl.noStore().mustRevalidate());
        // 2. JS, CSS, 이미지 등 정적 자원은 1년 등 길게 캐싱해도 됨 (어차피 파일명에 해시가 붙어 다름)
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/")
                .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic());
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(
                        "http://localhost:3000",
                        "http://localhost:5173",
                        "https://dwaeji.kr",
                        "https://www.dwaeji.kr"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterRegistrationBean() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.addAllowedOrigin("http://localhost:3000");
        config.addAllowedOrigin("http://localhost:5173");
        config.addAllowedOrigin("https://dwaeji.kr");
        config.addAllowedOrigin("https://www.dwaeji.kr");
        config.addAllowedOrigin("https://www2.dwaeji.kr");
        config.addAllowedOrigin("https://api.dwaeji.kr");
        config.addAllowedOrigin("https://apit.dwaeji.kr");
        config.addAllowedHeader("*");
        config.addAllowedMethod("GET");
        config.addAllowedMethod("POST");
        config.addAllowedMethod("PUT");
        config.addAllowedMethod("DELETE");
        config.addAllowedMethod("OPTIONS");
        config.setMaxAge(3600L);
        source.registerCorsConfiguration("/**", config);

        CorsFilter filter = new CorsFilter(source);
        FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(filter);
        // 필터 체인에서 가장 먼저 실행되도록 설정 (스프링 시큐리티보다 앞서 동작해야 CORS Preflight 오류가 없음)
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        // 에러 발생 시(/error 포워딩)에도 CORS 헤더가 유지되도록 DispatcherType 추가
        bean.setDispatcherTypes(jakarta.servlet.DispatcherType.REQUEST, jakarta.servlet.DispatcherType.ERROR, jakarta.servlet.DispatcherType.FORWARD, jakarta.servlet.DispatcherType.ASYNC);
        return bean;
    }
}
