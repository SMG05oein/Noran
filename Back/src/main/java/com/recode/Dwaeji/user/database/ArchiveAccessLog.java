package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "Archive_access_log")
@Comment("아카이브 접근 로그")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class ArchiveAccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_idx")
    @Comment("로그 PK")
    private Long logIdx;

    @Column(name = "accessor_user_idx", nullable = false)
    @Comment("접근자 사용자 PK")
    private Long accessorUserIdx;

    @Column(name = "accessor_ip", length = 50)
    @Comment("접근자 IP")
    private String accessorIp;

    @Column(name = "access_reason", length = 255, nullable = false)
    @Comment("접근 사유")
    private String accessReason;

    @Column(name = "target_original_user_idx")
    @Comment("대상 원본 사용자 PK")
    private Long targetOriginalUserIdx;

    @CreatedDate
    @Column(name = "accessed_at", nullable = false, updatable = false)
    @Comment("접근 일시")
    private LocalDateTime accessedAt;
}
