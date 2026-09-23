package com.recode.Dwaeji.gathering.database;

import com.recode.Dwaeji.user.database.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "gathering_comment")
@Comment("돼지들 모임 댓글")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class GatheringComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "comment_id")
    @Comment("댓글 PK")
    private Long commentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    @Comment("게시글 FK")
    private GatheringPost post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", nullable = false)
    @Comment("실제 작성 알바생 식별자")
    private User user;

    @Column(name = "author_name", length = 50, nullable = false)
    @Comment("작성자 이름")
    private String authorName;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    @Comment("댓글 본문")
    private String content;

    @Builder.Default
    @Column(name = "is_anonymous", nullable = false, columnDefinition = "TINYINT(1)")
    @Comment("1: 익명, 0: 실명")
    private Boolean isAnonymous = false;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false, columnDefinition = "TINYINT(1)")
    @Comment("1: 논리적 삭제됨, 0: 정상")
    private Boolean isDeleted = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP")
    @Comment("생성 일시")
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    @Comment("논리적 삭제 일시")
    private LocalDateTime deletedAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
