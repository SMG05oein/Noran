package com.recode.Dwaeji;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.HexFormat;

@Component
public class JwtUtil {

    public static final int REFRESH_TTL_DAYS_DEFAULT = 7;
    public static final int REFRESH_TTL_DAYS_AUTO_LOGIN = 30;

    public static final String TOKEN_TYPE_ACCESS = "access";
    public static final String TOKEN_TYPE_REFRESH = "refresh";

    private final SecretKey key;
    private final Instant legacyGraceStart;
    private final Instant legacyGraceEnd;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.legacy-grace-start:2026-11-03T00:00:00+09:00}") String graceStart,
            @Value("${jwt.legacy-grace-end:2026-11-15T00:00:00+09:00}") String graceEnd) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("jwt.secret must be at least 32 bytes (set JWT_SECRET env)");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.legacyGraceStart = OffsetDateTime.parse(graceStart).toInstant();
        this.legacyGraceEnd = OffsetDateTime.parse(graceEnd).toInstant();
    }

    /** 유예 구간 [시작, 종료) — 시작 포함, 종료 미포함 */
    public boolean isLegacyGraceActive() {
        Instant now = Instant.now();
        return !now.isBefore(legacyGraceStart) && now.isBefore(legacyGraceEnd);
    }

    // JWT 만들어주는 함수
    public String createAccessToken(String email, String role, String authType) {
        long accessTokenValidTime = 20 * 60 * 1000L; // 20분
        return Jwts.builder()
                .subject(email) // setSubject() -> subject()
                .claim("position", authType)
                .claim("role", role)
                .claim("token_type", TOKEN_TYPE_ACCESS)
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

    public String createRefreshToken(String email) {
        return createRefreshToken(email, REFRESH_TTL_DAYS_DEFAULT);
    }

    public String createRefreshToken(String email, int ttlDays) {
        int days = ttlDays > 0 ? ttlDays : REFRESH_TTL_DAYS_DEFAULT;
        long refreshTokenValidTime = days * 24L * 60 * 60 * 1000L;

        return Jwts.builder()
                .subject(email)
                .claim("ttlDays", days)
                .claim("token_type", TOKEN_TYPE_REFRESH)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTokenValidTime))
                .signWith(key)
                .compact();
    }

    /** 리프레시 JWT의 ttlDays 클레임. 없으면 기본 7일 (구 토큰 호환). */
    public int getRefreshTtlDays(Claims claims) {
        Integer ttlDays = claims.get("ttlDays", Integer.class);
        if (ttlDays == null || ttlDays <= 0) {
            return REFRESH_TTL_DAYS_DEFAULT;
        }
        return ttlDays;
    }

    public String getTokenType(Claims claims) {
        return claims.get("token_type", String.class);
    }

    /**
     * Bearer API용: token_type이 access이거나, 유예 중 구 AT(role 있음)이면 true.
     * refresh 타입이거나 role 없는 구 RT면 false.
     */
    public boolean isAccessTokenUsable(Claims claims) {
        String type = getTokenType(claims);
        if (TOKEN_TYPE_ACCESS.equals(type)) {
            return true;
        }
        if (TOKEN_TYPE_REFRESH.equals(type)) {
            return false;
        }
        if (!isLegacyGraceActive()) {
            return false;
        }
        String role = claims.get("role", String.class);
        return role != null && !role.isBlank();
    }

    /**
     * /refresh 쿠키용: token_type이 refresh이거나, 유예 중 구 RT(token_type 없고 role 없음)이면 true.
     */
    public boolean isRefreshTokenUsable(Claims claims) {
        String type = getTokenType(claims);
        if (TOKEN_TYPE_REFRESH.equals(type)) {
            return true;
        }
        if (TOKEN_TYPE_ACCESS.equals(type)) {
            return false;
        }
        if (!isLegacyGraceActive()) {
            return false;
        }
        String role = claims.get("role", String.class);
        return role == null || role.isBlank();
    }

    /** 리프레시 토큰 DB 저장용 SHA-256 헥스 (UTF-8 바이트 기준). */
    public static String sha256Hex(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("raw token is null");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다", e);
        }
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
