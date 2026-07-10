package com.recode.Dwaeji.developer.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DevLoginRequestDto {
    private String devId;
    private String devPw;
}
