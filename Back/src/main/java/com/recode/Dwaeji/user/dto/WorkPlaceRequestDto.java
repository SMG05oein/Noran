package com.recode.Dwaeji.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

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
