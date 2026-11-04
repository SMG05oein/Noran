package com.recode.Dwaeji;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
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
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

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

        // CORS Preflight 요청(OPTIONS)은 JWT 검증 없이 통과 (토큰 없으면 403 반환되어 CORS 차단됨)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        // 로그인, 회원가입, 로그아웃, 공개 공지사항/점검모드 및 Swagger 경로는 JWT 필터를 거치지 않도록 설정
        if (path.startsWith("/api/user/login") || path.startsWith("/api/user/signup")
                || path.startsWith("/api/user/refresh") || path.startsWith("/api/user/logout")
                || path.startsWith("/api/dev/auth/login")
                || path.startsWith("/api/dev/auth/ip-otp/")
                || path.startsWith("/api/work-place/all") || path.startsWith("/api/banks")
                || path.startsWith("/api/dev/announcements/public") || path.startsWith("/api/dev/announcements/maintenance-status")
                || path.startsWith("/swagger") || path.startsWith("/v3/api-docs") || path.startsWith("/swagger-ui")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = resolveToken(request);

        if (token != null) {
            try {
                Claims claims = jwtUtil.extractToken(token);
                if (!jwtUtil.isAccessTokenUsable(claims)) {
                    // refresh·유예 중 RT를 Bearer로 쓴 경우·유예 종료 후 구 토큰 → 인증하지 않음
                    filterChain.doFilter(request, response);
                    return;
                }

                String userId = claims.getSubject();
                String role = claims.get("role", String.class);

                List<GrantedAuthority> authorities = Collections.emptyList();
                if (role != null) {
                    authorities = Collections.singletonList(new SimpleGrantedAuthority(role));
                }

                // 액세스 토큰 클레임만으로 인증 객체 구성 (요청마다 User DB 조회하지 않음)
                UserDetails userDetails = User.withUsername(userId)
                        .password("")
                        .authorities(authorities)
                        .build();

                Authentication authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, authorities
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (ExpiredJwtException e) {
                System.err.println("Token Expired: " + e.getMessage());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            } catch (JwtException e) {
                System.err.println("JWT Validation Failed: " + e.getMessage());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            } catch (Exception e) {
                System.err.println("Authentication Filter Error: " + e.getMessage());
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
