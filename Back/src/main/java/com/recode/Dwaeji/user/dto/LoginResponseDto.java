package com.recode.Dwaeji.user.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
