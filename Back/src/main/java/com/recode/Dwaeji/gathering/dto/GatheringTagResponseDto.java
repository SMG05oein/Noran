package com.recode.Dwaeji.gathering.dto;

import com.recode.Dwaeji.gathering.database.GatheringTag;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringTagResponseDto {
    private Integer id;
    private Integer tagId;
    private String name;
    private Integer emojiIdx;
    private LocalDateTime createdAt;

    public static GatheringTagResponseDto fromEntity(GatheringTag tag) {
        if (tag == null) return null;
        return GatheringTagResponseDto.builder()
                .id(tag.getTagId())
                .tagId(tag.getTagId())
                .name(tag.getName())
                .emojiIdx(tag.getEmojiIdx())
                .createdAt(tag.getCreatedAt())
                .build();
    }
}
