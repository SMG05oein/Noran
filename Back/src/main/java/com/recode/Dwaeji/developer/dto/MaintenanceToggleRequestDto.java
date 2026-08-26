package com.recode.Dwaeji.developer.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceToggleRequestDto {

    @NotNull(message = "점검 모드 설정 값(enabled)은 필수입니다.")
    private Boolean enabled;
}
