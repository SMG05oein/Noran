package com.recode.Dwaeji.gathering.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringRulesStatusResponseDto {
    private Boolean hasAgreedGatheringRules;
    private Boolean hasWritten;
}
