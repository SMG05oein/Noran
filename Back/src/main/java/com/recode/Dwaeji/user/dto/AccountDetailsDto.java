package com.recode.Dwaeji.user.dto;

import com.recode.Dwaeji.user.database.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountDetailsDto {
    private String userBank;
    private String userAccountName;
    private String userAccountNumber; // 원문

    public static AccountDetailsDto fromEntity(User user) {
        if (user == null) return null;
        return AccountDetailsDto.builder()
                .userBank(user.getUserBank())
                .userAccountName(user.getUserAccountName())
                .userAccountNumber(user.getUserAccountNumber())
                .build();
    }

    @com.fasterxml.jackson.annotation.JsonProperty("bankCode")
    public String getBankCode() {
        return userBank;
    }
}
