package com.recode.Dwaeji.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminRegisterRequestDto {

    @NotBlank(message = "아이디를 입력해주세요.")
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "영문자와 숫자만 입력할 수 있습니다.")
    private String userId;

    private java.time.LocalDate userBirth;

    @NotBlank(message = "비밀번호를 입력해주세요.")
    private String userPw;

    @NotBlank(message = "이름을 입력해주세요.")
    @Pattern(regexp = "^[ㄱ-ㅎㅏ-ㅣ가-힣]+$", message = "이름에는 한글만 입력할 수 있습니다. (띄어쓰기, 숫자, 영문 등 불가)")
    private String userName;

    @NotBlank(message = "전화번호를 입력해주세요.")
    @Pattern(regexp = "^\\d{3}-\\d{3,4}-\\d{4}$", message = "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)")
    private String userPhone;

    @NotNull(message = "소속 지점을 선택해주세요.")
    private Long fkWorkPlaceIdx;

    // "WORKER" 또는 "ADMIN"
    @NotBlank(message = "역할을 선택해주세요.")
    private String role;

    // role이 "ADMIN"일 경우 선택적으로 직급 ID 전달
    private Long fkUtIdx;
}
