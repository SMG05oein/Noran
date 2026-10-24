package com.recode.Dwaeji.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서비스 → 컨트롤러 내부 전달용.
 * refreshToken은 HttpOnly 쿠키로만 내려가며 JSON body에는 포함하지 않는다.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthTokenResult {
    private String accessToken;
    private String refreshToken;
    private String msg;
    private Integer isTempUser;
}
