package com.recode.Dwaeji.gathering.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GatheringReportStatusUpdateRequestDto {

    @NotBlank(message = "변경할 상태값은 필수입니다.")
    @Pattern(regexp = "^(PENDING|RESOLVED|DISMISSED)$", message = "상태값은 PENDING, RESOLVED, DISMISSED 중 하나여야 합니다.")
    private String status;
}
