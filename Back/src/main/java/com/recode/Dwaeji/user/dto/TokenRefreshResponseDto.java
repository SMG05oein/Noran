package com.recode.Dwaeji.user.dto;

import lombok.Builder;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TokenRefreshResponseDto {
    private String accessToken;
    private String msg;
}
