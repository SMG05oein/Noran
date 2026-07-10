package com.recode.Dwaeji.developer.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DevChangePwRequestDto {
    private String oldPw;
    private String newPw;
}
