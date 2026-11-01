package com.recode.Dwaeji.gathering.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringUnmaskResponseDto {
    private Long targetId;
    private String realName;
    private String targetUserId;
    private String branch;
    private LocalDateTime viewedAt;
}
