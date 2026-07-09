package com.recode.Dwaeji.user.dto;

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
public class WorkPlaceRequestDto {
    private String wpName;
    private String wpAddress;
    private String wpAddressDetails;
}
