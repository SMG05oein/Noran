package com.recode.Dwaeji.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TempPasswordRequestDto {

    @NotBlank(message = "임시 비밀번호는 필수입니다.")
    private String tempPw;
}
