package com.recode.Dwaeji.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TempPasswordRequestDto {

    @NotBlank(message = "임시 비밀번호는 필수입니다.")
    private String tempPw;
}
