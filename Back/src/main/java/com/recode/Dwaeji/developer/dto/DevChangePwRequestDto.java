package com.recode.Dwaeji.developer.dto;

import lombok.Builder;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DevChangePwRequestDto {

    @NotBlank(message = "기존 비밀번호는 필수 입력 항목입니다.")
    private String oldPw;

    @NotBlank(message = "새 비밀번호는 필수 입력 항목입니다.")
    private String newPw;
}
