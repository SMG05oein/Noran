package com.recode.Dwaeji.joke.database;

import com.recode.Dwaeji.user.database.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "joke", comment = "오늘의 농담")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Joke {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "joke_id", comment = "농담 PK")
    private Long jokeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", nullable = false, comment = "등록 알바생 식별자")
    private User user;

    @Column(name = "author_name", length = 50, nullable = false, comment = "작성자 이름")
    private String authorName;

    @Column(name = "situation", length = 255, nullable = false, comment = "상황 설명")
    private String situation;

    @Column(name = "setup", length = 255, nullable = false, comment = "질문/발단")
    private String setup;

    @Column(name = "punchline", length = 255, nullable = false, comment = "정답/반전")
    private String punchline;

    @Column(name = "detail", columnDefinition = "TEXT", comment = "추가 비하인드 썰")
    private String detail;

    @Builder.Default
    @Column(name = "emoji_idx", nullable = false, comment = "프론트 이모지 인덱스")
    private Integer emojiIdx = 0;

    @Builder.Default
    @Column(name = "is_anonymous", nullable = false, columnDefinition = "TINYINT(1)", comment = "1: 익명, 0: 실명")
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
