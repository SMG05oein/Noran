package com.recode.Dwaeji;

import com.recode.Dwaeji.user.service.CustomUserDetailsService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService customUserDetailsService;

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        // 로그인, 회원가입, 공개 공지사항/점검모드 및 Swagger 경로는 JWT 필터를 거치지 않도록 설정
        if (path.startsWith("/api/user/login") || path.startsWith("/api/user/signup") 
                || path.startsWith("/api/user/refresh") || path.startsWith("/api/dev/auth/login")
                || path.startsWith("/api/dev/announcements/public") || path.startsWith("/api/dev/announcements/maintenance-status")
                || path.startsWith("/swagger") || path.startsWith("/v3/api-docs") || path.startsWith("/swagger-ui")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = resolveToken(request);

        if (token != null) {
            try {
                // 1. 토큰에서 전체 클레임 추출
                Claims claims = jwtUtil.extractToken(token);
                String email = claims.getSubject();

                // 2. 토큰 내의 'role' 값을 직접 가져옴 (민관님의 토큰 구조: "role": "ADMIN5")
                String role = claims.get("role", String.class);

                // 3. 권한 객체 생성 (SimpleGrantedAuthority)
                // 만약 토큰에 ADMIN5라고 되어 있으면 ADMIN5라는 권한을 생성합니다.
                List<GrantedAuthority> authorities = Collections.emptyList();
                if (role != null) {
                    authorities = Collections.singletonList(new SimpleGrantedAuthority(role));
                }

                // 4. UserDetails 로드 (인증된 사용자 객체 생성용)
                UserDetails userDetails;
                if ("ROLE_DEVELOPER".equals(role)) {
                    userDetails = org.springframework.security.core.userdetails.User.withUsername(email)
                            .password("")
                            .authorities(authorities)
                            .build();
                } else {
                    userDetails = customUserDetailsService.loadUserByUsername(email);
                }

                // 5. 토큰에서 추출한 실시간 권한(authorities)을 사용하여 인증 객체 생성
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, authorities
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (ExpiredJwtException e) {
                System.err.println("Token Expired: " + e.getMessage());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            } catch (Exception e) {
                System.err.println("JWT Validation Failed: " + e.getMessage());
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}