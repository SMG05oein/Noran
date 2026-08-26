package com.recode.Dwaeji.developer.dto;

import lombok.Builder;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DevLoginRequestDto {
    private String devId;
    private String devPw;
}
