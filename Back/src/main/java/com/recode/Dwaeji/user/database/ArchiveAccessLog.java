package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "Archive_access_log")
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
    private Long logIdx;

    @Column(name = "accessor_user_idx", nullable = false)
    private Long accessorUserIdx;

    @Column(name = "accessor_ip", length = 50)
    private String accessorIp;

    @Column(name = "access_reason", length = 255, nullable = false)
    private String accessReason;

    @Column(name = "target_original_user_idx")
    private Long targetOriginalUserIdx;

    @CreatedDate
    @Column(name = "accessed_at", nullable = false, updatable = false)
    private LocalDateTime accessedAt;
}
