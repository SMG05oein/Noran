package com.recode.Dwaeji.user.dto;

import com.recode.Dwaeji.user.database.User;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SensitiveInfoDto {

    private String userAccountNumber; // 원문
    private String userAccountName; // 예금주
    private String userBank;
    private Integer userHourlyWage;

    public static SensitiveInfoDto fromEntity(User user) {
        if (user == null) return null;
        return SensitiveInfoDto.builder()
                .userAccountNumber(user.getUserAccountNumber())
                .userAccountName(user.getUserAccountName())
                .userBank(user.getUserBank())
                .userHourlyWage(user.getUserHourlyWage())
                .build();
    }

    @com.fasterxml.jackson.annotation.JsonProperty("bankCode")
    public String getBankCode() {
        return userBank;
    }
}
