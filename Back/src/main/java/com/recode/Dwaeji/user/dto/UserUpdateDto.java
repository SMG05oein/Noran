package com.recode.Dwaeji.user.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Builder;

import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserUpdateDto {
    /** null이면 미변경. 값이 있으면 한글만. */
    @Pattern(regexp = "^[ㄱ-ㅎㅏ-ㅣ가-힣]+$", message = "이름에는 한글만 입력할 수 있습니다. (띄어쓰기, 숫자, 영문 등 불가)")
    private String userName;
    private String userEmail;
    private String userPhone;
    private LocalDate userBirth;
    private Long fkUtIdx;
    private Long fkWorkPlaceIdx;
    @JsonAlias("bankCode")
    private String userBank;
    private String userAccountNumber;
    private Integer userHourlyWage;
    private Integer emailConsentAgreed;
}
