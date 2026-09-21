package com.recode.Dwaeji.user.dto;

import lombok.Builder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginRequestDto {

    @NotBlank(message = "아이디를 입력해주세요.")
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "영문자와 숫자만 입력할 수 있습니다.")
    private String userId;

    @NotBlank(message = "비밀번호를 입력해주세요.")
    private String userPw;
}
