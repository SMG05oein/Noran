package com.recode.Dwaeji.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangePasswordDto {

    @NotBlank(message = "현재 비밀번호를 입력해주세요.")
    private String currentPw;

    @NotBlank(message = "새 비밀번호를 입력해주세요.")
    private String newPw;
}
