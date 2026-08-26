package com.recode.Dwaeji.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    private Integer userIsActive;


    private String userAccountName; // 예금주
    private String userAccountNumber; // 기재 여부만 반환 ("기재" or null)
    private String userBank;
    private Integer userHourlyWage;
    
    @JsonProperty("is_admin")
    private Integer isAdmin;
}
