package com.recode.Dwaeji.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SignupRequestDto {
    private String userId;
    private String userPw;
    private String userName;
    private String userPhone;
    private Long fkUtIdx;
    private Long fkWorkPlaceIdx;
}
