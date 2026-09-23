package com.recode.Dwaeji.gathering.database;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "gathering_unmask_logs")
@Comment("커뮤니티 익명 작성자 실명 열람 감사 로그")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class GatheringUnmaskLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("감사 로그 PK")
    private Long id;

    @Column(name = "admin_id", length = 50, nullable = false)
    @Comment("열람한 관리자 ID")
    private String adminId;

    @Column(name = "target_type", length = 20, nullable = false)
    @Comment("POST 또는 COMMENT")
    private String targetType;

    @Column(name = "target_id", nullable = false)
    @Comment("게시글 또는 댓글 ID")
    private Long targetId;

    @Column(name = "target_user_id", length = 50, nullable = false)
    @Comment("실제 작성자 회원 ID")
    private String targetUserId;

    @Column(name = "reason", length = 255, nullable = false)
    @Comment("열람 사유 (신고 조사, 분쟁 해결 등)")
    private String reason;

    @CreatedDate
    @Column(name = "viewed_at", nullable = false, updatable = false, columnDefinition = "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP")
    @Comment("열람 일시")
    private LocalDateTime viewedAt;

    @PrePersist
    public void prePersist() {
        if (this.viewedAt == null) {
            this.viewedAt = LocalDateTime.now();
        }
    }
}
