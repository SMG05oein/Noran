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
}
