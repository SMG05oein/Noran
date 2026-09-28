package com.recode.Dwaeji.common.config;

import com.recode.Dwaeji.JwtFilter;
import com.recode.Dwaeji.JwtUtil;
import com.recode.Dwaeji.user.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService customUserDetailsService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // JWT 기반 API 서버 → CSRF 불필요
            .csrf(AbstractHttpConfigurer::disable)

            // 세션 미사용 (Stateless)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // CORS는 WebMvcConfig의 CorsFilter가 처리
            .cors(cors -> {})

            .authorizeHttpRequests(auth -> auth
                // CORS Preflight 전체 허용
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // 인증 없이 접근 가능한 공개 엔드포인트
                .requestMatchers(
                    "/api/user/login",
                    "/api/user/signup",
                    "/api/user/refresh",
                    "/api/dev/auth/login",
                    "/api/dev/auth/ip-otp/**",
                    "/api/work-place/all",
                    "/api/banks",
                    "/api/dev/announcements/public",
                    "/api/dev/announcements/maintenance-status",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**"
                ).permitAll()

                // 나머지 모든 요청은 인증 필요
                .anyRequest().authenticated()
            )

            // JwtFilter를 Spring Security 필터 체인에 등록
            .addFilterBefore(
                new JwtFilter(jwtUtil, customUserDetailsService),
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}
