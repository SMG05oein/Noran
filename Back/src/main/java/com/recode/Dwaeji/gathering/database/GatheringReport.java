package com.recode.Dwaeji.gathering.database;

import com.recode.Dwaeji.user.database.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "gathering_report", comment = "돼지들 모임 신고 접수")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class GatheringReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id", comment = "신고 접수 PK")
    private Long reportId;

    @Column(name = "target_type", length = 20, nullable = false, comment = "신고 대상 유형 (POST, COMMENT)")
    private String targetType;

    @Column(name = "post_id", nullable = false, comment = "원문 게시글 PK")
    private Long postId;

    @Column(name = "comment_id", comment = "신고 대상 댓글 PK (게시글 신고 시 NULL)")
    private Long commentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", nullable = false, comment = "신고 접수 알바생 식별자")
    private User user;

    @Column(name = "reason", length = 100, nullable = false, comment = "신고 사유")
    private String reason;

    @Column(name = "details", columnDefinition = "TEXT", comment = "상세 신고 내용")
    private String details;

    @Builder.Default
    @Column(name = "status", length = 20, nullable = false, comment = "신고 처리 상태 (PENDING, PROCESSED, REJECTED)")
    private String status = "PENDING";

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", comment = "신고 접수 일시")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
