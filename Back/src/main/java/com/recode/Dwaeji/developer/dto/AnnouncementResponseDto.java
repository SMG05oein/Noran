package com.recode.Dwaeji.developer.dto;

import com.recode.Dwaeji.developer.database.Announcement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnnouncementResponseDto {
    private Long id;
    private String title;
    private String content;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private java.time.LocalDate startDate;
    private java.time.LocalDate endDate;

    public static AnnouncementResponseDto from(Announcement entity) {
        if (entity == null) return null;
        return AnnouncementResponseDto.builder()
                .id(entity.getAnnIdx())
                .title(entity.getAnnTitle())
                .content(entity.getAnnContent())
                .isActive(entity.getAnnIsActive() != null && entity.getAnnIsActive() == 1)
                .createdAt(entity.getAnnCreatedAt())
                .startDate(entity.getAnnStartDate())
                .endDate(entity.getAnnEndDate())
                .build();
    }
}
