package com.recode.Dwaeji.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * CORS origins from {@code CORS_ALLOWED_ORIGINS} / {@code cors.allowed-origins}
 * (comma-separated). Defaults match production www/api hosts.
 */
@Component
public class CorsOriginsSupport {

    private static final String DEFAULT =
            "http://localhost:3000,http://localhost:5173,"
                    + "https://dwaeji.kr,https://www.dwaeji.kr,https://api.dwaeji.kr";

    private final List<String> origins;

    public CorsOriginsSupport(
            @Value("${cors.allowed-origins:${CORS_ALLOWED_ORIGINS:}}") String configured) {
        String raw = (configured == null || configured.isBlank()) ? DEFAULT : configured;
        this.origins = Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    public List<String> origins() {
        return origins;
    }
}
