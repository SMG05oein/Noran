package com.recode.Dwaeji.alarm.database;

import com.recode.Dwaeji.user.database.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "push_subscription",
        comment = "웹 푸시 구독(기기별)",
        uniqueConstraints = @UniqueConstraint(name = "uk_push_endpoint", columnNames = "endpoint")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class PushSubscriptionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ps_idx", comment = "구독 PK")
    private Long psIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false, comment = "사용자 FK")
    private User user;

    @Column(name = "endpoint", length = 1024, nullable = false, comment = "Push endpoint URL")
    private String endpoint;

    @Column(name = "p256dh", length = 255, nullable = false, comment = "client p256dh key")
    private String p256dh;

    @Column(name = "auth", length = 255, nullable = false, comment = "client auth secret")
    private String auth;

    @Column(name = "user_agent", length = 512, comment = "User-Agent")
    private String userAgent;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
