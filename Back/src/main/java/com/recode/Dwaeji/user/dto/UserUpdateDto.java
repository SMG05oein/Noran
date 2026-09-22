package com.recode.Dwaeji.user.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Builder;

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
