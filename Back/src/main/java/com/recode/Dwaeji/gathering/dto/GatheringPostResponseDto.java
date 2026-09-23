package com.recode.Dwaeji.gathering.dto;

import com.recode.Dwaeji.gathering.database.GatheringPost;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringPostResponseDto {
    private Long id;
    private Long postId;
    private Integer tagId;
    private String tagName;
    private Integer tagEmojiIdx;
    private Long userIdx;
    private String authorName;
    private String title;
    private String content;
    private Integer emojiIdx;
    private Boolean isAnonymous;
    private Long commentCount;
    private Boolean isDeleted;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static GatheringPostResponseDto fromEntity(GatheringPost post, Long commentCount, boolean canViewRealAuthor) {
        if (post == null) return null;

        String displayName = post.getAuthorName();
        Long displayedUserIdx = post.getUser() != null ? post.getUser().getUserIdx() : null;

        if (Boolean.TRUE.equals(post.getIsAnonymous()) && !canViewRealAuthor) {
            displayName = "익명의 돼지 🐷";
            displayedUserIdx = null; // 익명 작성자의 식별자는 마스킹
        }

        return GatheringPostResponseDto.builder()
                .id(post.getPostId())
                .postId(post.getPostId())
                .tagId(post.getTag() != null ? post.getTag().getTagId() : null)
                .tagName(post.getTag() != null ? post.getTag().getName() : null)
                .tagEmojiIdx(post.getTag() != null ? post.getTag().getEmojiIdx() : null)
                .userIdx(displayedUserIdx)
                .authorName(displayName)
                .title(post.getTitle())
                .content(post.getContent())
                .emojiIdx(post.getEmojiIdx())
                .isAnonymous(post.getIsAnonymous())
                .isDeleted(post.getIsDeleted())
                .deletedAt(post.getDeletedAt())
                .commentCount(commentCount != null ? commentCount : 0L)
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }
}
