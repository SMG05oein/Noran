package com.recode.Dwaeji.gathering.database;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "gathering_tag")
@Comment("돼지들 모임 태그")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class GatheringTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tag_id")
    @Comment("태그 PK")
    private Integer tagId;

    @Column(name = "name", length = 50, unique = true, nullable = false)
    @Comment("태그명")
    private String name;

    @Builder.Default
    @Column(name = "emoji_idx", nullable = false)
    @Comment("프론트 이모지 배열 인덱스")
    private Integer emojiIdx = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP")
    @Comment("생성 일시")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
