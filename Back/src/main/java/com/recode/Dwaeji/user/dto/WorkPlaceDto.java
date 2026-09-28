package com.recode.Dwaeji.user.dto;

import com.recode.Dwaeji.user.database.WorkPlace;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkPlaceDto {
    private Long wpIdx;
    private String wpName;
    private String wpAddress;
    private String wpAddressDetails;

    public static WorkPlaceDto fromEntity(WorkPlace entity) {
        if (entity == null) return null;
        return WorkPlaceDto.builder()
                .wpIdx(entity.getWpIdx())
                .wpName(entity.getWpName())
                .wpAddress(entity.getWpAddress())
                .wpAddressDetails(entity.getWpAddressDetails())
                .build();
    }
}
