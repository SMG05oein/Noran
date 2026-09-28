package com.recode.Dwaeji.user.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankInfoUpdateDto {

    @NotBlank(message = "은행을 선택해주세요.")
    @JsonAlias("bankCode")
    private String userBank;

    /** 마스킹('기재')된 경우 Front가 생략할 수 있음 */
    private String userAccountNumber;

    @NotBlank(message = "예금주명을 입력해주세요.")
    private String userAccountName;

    private Boolean bankConsentAgreed;
}
