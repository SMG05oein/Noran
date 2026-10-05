package com.recode.Dwaeji.developer.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceToggleRequestDto {

    @NotNull(message = "점검 모드 설정 값(enabled)은 필수입니다.")
    private Boolean enabled;

    /**
     * 점검 사유 (사용자에게 표시)
     */
    private String message;

    /**
     * ISO-8601. null이면 즉시 모드만
     */
    private String scheduledStart;

    private String scheduledEnd;
}
