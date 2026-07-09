package com.recode.Dwaeji.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BankInfoUpdateDto {
    private String userBank;
    private String userAccountNumber;
}
