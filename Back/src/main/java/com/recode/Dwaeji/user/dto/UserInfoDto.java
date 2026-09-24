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
    /** 본인 직급 ID — 권한 상세는 GET /api/user-types 에서 조회 */
    private Long fkUtIdx;
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
    /** 동명이인 플래그: 동일 실명 활성 인원 수. &gt;1 이면 관리자 UI에 #userIdx */
    private Long nameSeq;

    public static UserInfoDto fromEntity(User user) {
        if (user == null) return null;

        String hasAccount = (user.getUserAccountNumber() != null && !user.getUserAccountNumber().trim().isEmpty()) ? "기재" : null;
        Integer adminFlag = (user.getUserType() != null && user.getUserType().getUtIsAdmin() != null) ? user.getUserType().getUtIsAdmin() : 0;
        Integer emailConsent = (user.getEmailConsentAgreed() != null && user.getEmailConsentAgreed()) ? 1 : 0;
        var ut = user.getUserType();

        return UserInfoDto.builder()
                .userIdx(user.getUserIdx())
                .userId(user.getUserId())
                .userName(user.getUserName())
                .userEmail(user.getUserEmail())
                .userBirth(user.getUserBirth())
                .userPhone(user.getUserPhone())
                .userTypeName(ut != null ? ut.getUtName() : null)
                .fkUtIdx(ut != null ? ut.getUtIdx() : null)
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

    /** Front 호환: bankCode 별칭 */
    @JsonProperty("bankCode")
    public String getBankCode() {
        return userBank;
    }
}
