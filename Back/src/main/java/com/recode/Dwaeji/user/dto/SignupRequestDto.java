package com.recode.Dwaeji.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotNull;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SignupRequestDto {

    @NotBlank(message = "아이디를 입력해주세요.")
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "영문자와 숫자만 입력할 수 있습니다.")
    private String userId;

    @NotBlank(message = "비밀번호를 입력해주세요.")
    private String userPw;

    @NotBlank(message = "이름을 입력해주세요.")
    private String userName;

    @NotBlank(message = "전화번호를 입력해주세요.")
    @Pattern(regexp = "^\\d{3}-\\d{3,4}-\\d{4}$", message = "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)")
    private String userPhone;

    @NotNull(message = "회원 유형을 선택해주세요.")
    private Long fkUtIdx;

    @NotNull(message = "소속 지점을 선택해주세요.")
    private Long fkWorkPlaceIdx;
}
