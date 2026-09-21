package com.recode.Dwaeji.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.recode.Dwaeji.user.database.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@JsonInclude(JsonInclude.Include.NON_NULL)

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserInfoDto {
    private Long userIdx;
    private String userId;
    private String userName;
    private String userEmail;
    private LocalDate userBirth;
    private String userPhone;
    private String userTypeName;
    private String workPlaceName;
    private Long workPlaceIdx;
    private Integer userIsActive;

    private String userAccountName; // 예금주
    private String userAccountNumber; // 기재 여부만 반환 ("기재" or null)
    private String userBank;
    private Integer userHourlyWage;
    
    private java.time.LocalDateTime userWithdrawnAt;
    
    @JsonProperty("is_admin")
    private Integer isAdmin;
    
    private Integer emailConsentAgreed;

    public static UserInfoDto fromEntity(User user) {
        if (user == null) return null;

        String hasAccount = (user.getUserAccountNumber() != null && !user.getUserAccountNumber().trim().isEmpty()) ? "기재" : null;
        Integer adminFlag = (user.getUserType() != null && user.getUserType().getUtIsAdmin() != null) ? user.getUserType().getUtIsAdmin() : 0;
        Integer emailConsent = (user.getEmailConsentAgreed() != null && user.getEmailConsentAgreed()) ? 1 : 0;

        return UserInfoDto.builder()
                .userIdx(user.getUserIdx())
                .userId(user.getUserId())
                .userName(user.getUserName())
                .userEmail(user.getUserEmail())
                .userBirth(user.getUserBirth())
                .userPhone(user.getUserPhone())
                .userTypeName(user.getUserType() != null ? user.getUserType().getUtName() : null)
                .workPlaceName(user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : null)
                .workPlaceIdx(user.getWorkPlace() != null ? user.getWorkPlace().getWpIdx() : null)
                .userIsActive(user.getUserIsActive())
                .userAccountName(user.getUserAccountName())
                .userAccountNumber(hasAccount)
                .userBank(user.getUserBank())
                .userHourlyWage(user.getUserHourlyWage())
                .userWithdrawnAt(user.getUserWithdrawnAt())
                .isAdmin(adminFlag)
                .emailConsentAgreed(emailConsent)
                .build();
    }
}
