package com.recode.Dwaeji.developer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnnouncementListResponseDto {
    private Boolean maintenanceMode;
    private String message;
    private String scheduledStart;
    private String scheduledEnd;
    private List<AnnouncementResponseDto> notices;
}
