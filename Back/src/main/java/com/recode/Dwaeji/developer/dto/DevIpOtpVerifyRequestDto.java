package com.recode.Dwaeji.developer.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DevIpOtpVerifyRequestDto {
    private String code;
}
