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
public class BankInfoUpdateDto {

    @NotBlank(message = "은행명을 입력해주세요.")
    private String userBank;

    @NotBlank(message = "계좌번호를 입력해주세요.")
    private String userAccountNumber;

    @NotBlank(message = "예금주명을 입력해주세요.")
    private String userAccountName;

    private Boolean bankConsentAgreed;
}
