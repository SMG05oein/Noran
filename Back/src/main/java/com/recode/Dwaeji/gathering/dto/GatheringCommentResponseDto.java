package com.recode.Dwaeji.gathering.dto;

import com.recode.Dwaeji.gathering.database.GatheringComment;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringCommentResponseDto {
    private Long id;
    private Long commentId;
    private Long postId;
    private Long userIdx;
    private String authorName;
    private String content;
    private Boolean isAnonymous;
    private LocalDateTime createdAt;

    public static GatheringCommentResponseDto fromEntity(GatheringComment comment, boolean canViewRealAuthor) {
        if (comment == null) return null;

        String displayName = comment.getAuthorName();
        Long displayedUserIdx = comment.getUser() != null ? comment.getUser().getUserIdx() : null;

        if (Boolean.TRUE.equals(comment.getIsAnonymous()) && !canViewRealAuthor) {
            displayName = "익명의 돼지 🐷";
            displayedUserIdx = null; // 익명 작성자의 식별자는 마스킹
        }

        return GatheringCommentResponseDto.builder()
                .id(comment.getCommentId())
                .commentId(comment.getCommentId())
                .postId(comment.getPost() != null ? comment.getPost().getPostId() : null)
                .userIdx(displayedUserIdx)
                .authorName(displayName)
                .content(comment.getContent())
                .isAnonymous(comment.getIsAnonymous())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
