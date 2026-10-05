package com.recode.Dwaeji.user.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponseDto {
    private String accessToken;

    @JsonIgnore
    private String refreshToken;
    private String msg;
    private Integer isTempUser;
}
