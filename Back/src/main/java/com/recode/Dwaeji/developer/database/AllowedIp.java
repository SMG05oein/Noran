package com.recode.Dwaeji.developer.database;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "AllowedIp",
        comment = "허용 IP (DEV: 개발자 대시보드, SERVICE: 근태 서비스)",
        uniqueConstraints = @UniqueConstraint(name = "uk_allowed_ip_type_ip", columnNames = {"ip_type", "ip_address"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class AllowedIp {

    public enum Type { DEV, SERVICE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ip_idx", comment = "PK")
    private Long ipIdx;

    @Enumerated(EnumType.STRING)
    @Column(name = "ip_type", nullable = false, length = 20, comment = "DEV / SERVICE")
    private Type ipType;

    @Column(name = "ip_address", nullable = false, length = 64, comment = "IP 주소")
    private String ipAddress;

    @Column(name = "ip_memo", length = 100, comment = "메모")
    private String ipMemo;

    @Column(name = "ip_created_by", length = 100, comment = "등록자")
    private String ipCreatedBy;

    @CreatedDate
    @Column(name = "ip_created_at", nullable = false, updatable = false, comment = "등록 일시")
    private LocalDateTime ipCreatedAt;
}
