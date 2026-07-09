package com.recode.Dwaeji;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    // 💡 [수정 포인트 1] 평문 문자열을 그대로 쓸 때는 Base64 디코딩이 아니라 getBytes()를 써야 에러가 안 납니다!
    static final String SECRET_KEY = "jwtpassword123jwtpassword123jwtpassword123jwtpassword123jwtpassword"; // 최소 32바이트(256비트) 이상 유지
    static final SecretKey key = Keys.hmacShaKeyFor(SECRET_KEY.getBytes(StandardCharsets.UTF_8));

    // JWT 만들어주는 함수
    public String createAccessToken(String email, String role, String authType) {
        long accessTokenValidTime = 20 * 60 * 1000L; // 20분
        return Jwts.builder()
                .subject(email) // setSubject() -> subject()
                .claim("position", authType)
                .claim("role", role)
                .issuedAt(new Date()) // setIssuedAt() -> issuedAt()
                .expiration(new Date(System.currentTimeMillis() + accessTokenValidTime)) // setExpiration() -> expiration()
                .signWith(key) // 0.12.x부터는 알고리즘을 생략해도 key 크기에 맞춰 자동 지정됩니다.
                .compact();
    }

    // 토큰에서 Role 정보만 쏙 뽑아오는 메서드 (권한 체크용)
    public String getRole(String token) {
        return extractToken(token).get("role", String.class);
    }

    public String getPosition(String token) {
        return extractToken(token).get("position", String.class);
    }

    // JWT 리프레시 토큰
    public String createRefreshToken(String email) {
        long refreshTokenValidTime = 3 * 24 * 60 * 60 * 1000L; // 3일

        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTokenValidTime))
                .signWith(key)
                .compact();
    }

    // JWT 까주는 함수
    public Claims extractToken(String token) {
        // 💡 [수정 포인트 2] 0.12.x 최신 파싱 문법으로 변경
        return Jwts.parser()
                .verifyWith(key) // setSigningKey() -> verifyWith()
                .build()
                .parseSignedClaims(token) // parseClaimsJws() -> parseSignedClaims()
                .getPayload(); // getBody() -> getPayload()
    }
}