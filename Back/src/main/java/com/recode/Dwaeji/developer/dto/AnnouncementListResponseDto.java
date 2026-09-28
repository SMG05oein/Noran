package com.recode.Dwaeji.developer.dto;

import lombok.*;

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
