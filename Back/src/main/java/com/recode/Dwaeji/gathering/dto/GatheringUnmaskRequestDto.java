package com.recode.Dwaeji.gathering.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GatheringUnmaskRequestDto {

    @NotBlank(message = "열람 대상 유형(POST 또는 COMMENT)은 필수입니다.")
    private String targetType;

    @NotNull(message = "대상 식별자(targetId)는 필수입니다.")
    private Long targetId;

    private String reason;

    private String reasonType;

    private String reasonDetail;

    public String getEffectiveReason() {
        if (reason != null && !reason.isBlank()) {
            return reason.trim();
        }
        if (reasonDetail != null && !reasonDetail.isBlank()) {
            return reasonDetail.trim();
        }
        if (reasonType != null && !reasonType.isBlank()) {
            return reasonType.trim();
        }
        return "사규 위반 조사 및 사실관계 확인";
    }
}
