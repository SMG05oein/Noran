package com.recode.Dwaeji.gathering.database;

import com.recode.Dwaeji.user.database.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "gathering_post", comment = "돼지들 모임 게시글")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class GatheringPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "post_id", comment = "게시글 PK")
    private Long postId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false, comment = "태그 FK")
    private GatheringTag tag;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", nullable = false, comment = "실제 작성 알바생 식별자")
    private User user;

    @Column(name = "author_name", length = 50, nullable = false, comment = "작성자 이름 또는 닉네임")
    private String authorName;

    @Column(name = "title", length = 255, nullable = false, comment = "게시글 제목")
    private String title;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false, comment = "게시글 본문")
    private String content;

    @Builder.Default
    @Column(name = "emoji_idx", nullable = false, comment = "대표 이모지 인덱스")
    private Integer emojiIdx = 0;

    @Builder.Default
    @Column(name = "is_anonymous", nullable = false, columnDefinition = "TINYINT(1)", comment = "1: 익명 마스킹, 0: 실명")
    private Boolean isAnonymous = false;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false, columnDefinition = "TINYINT(1)", comment = "1: 논리적 삭제됨, 0: 정상")
    private Boolean isDeleted = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", comment = "생성 일시")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false, columnDefinition = "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", comment = "수정 일시")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at", comment = "논리적 삭제 일시")
    private LocalDateTime deletedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
