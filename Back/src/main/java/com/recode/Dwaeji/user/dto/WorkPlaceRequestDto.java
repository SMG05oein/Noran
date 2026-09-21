package com.recode.Dwaeji.user.dto;

import lombok.Builder;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkPlaceRequestDto {

    @NotBlank(message = "지점명은 필수입니다.")
    private String wpName;

    private String wpAddress;
    private String wpAddressDetails;
}
