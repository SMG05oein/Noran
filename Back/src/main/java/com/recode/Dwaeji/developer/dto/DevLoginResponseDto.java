package com.recode.Dwaeji.developer.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DevLoginResponseDto {
    private String accessToken;
    private String devId;
    private String devName;
    private Integer isTempPw;
}
