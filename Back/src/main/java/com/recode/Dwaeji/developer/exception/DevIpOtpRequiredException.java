package com.recode.Dwaeji.developer.exception;

import java.util.Map;

/** Thrown when credentials are OK but client IP is outside allowlist (OTP required). */
public class DevIpOtpRequiredException extends RuntimeException {

    private final Map<String, Object> body;

    public DevIpOtpRequiredException(Map<String, Object> body) {
        super(body != null ? String.valueOf(body.get("message")) : "DEV_IP_OTP_REQUIRED");
        this.body = body;
    }

    public Map<String, Object> getBody() {
        return body;
    }
}
