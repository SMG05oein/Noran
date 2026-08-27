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
public class UserUpdateDto {
    private String userName;
    private String userEmail;
    private String userPhone;
    private LocalDate userBirth;
    private Long fkUtIdx;
    private Long fkWorkPlaceIdx;
    private String userBank;
    private String userAccountNumber;
}
