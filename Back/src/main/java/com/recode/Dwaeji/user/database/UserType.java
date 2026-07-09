package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "User_type")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class UserType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ut_idx")
    private Long utIdx;

    @Column(name = "ut_name", length = 20)
    private String utName;

    @Builder.Default
    @Column(name = "ut_is_admin", columnDefinition = "TINYINT")
    private Integer utIsAdmin = 0;

    @Builder.Default
    @Column(name = "ut_is_super_admin", columnDefinition = "TINYINT")
    private Integer utIsSuperAdmin = 0;

    @CreatedDate
    @Column(name = "ut_created_at", nullable = false, updatable = false)
    private LocalDateTime utCreatedAt;

    @LastModifiedDate
    @Column(name = "ut_updated_at", nullable = false)
    private LocalDateTime utUpdatedAt;
}
