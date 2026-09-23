package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "Work_place")
@Comment("근무지")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class WorkPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wp_idx")
    @Comment("근무지 PK")
    private Long wpIdx;

    @Column(name = "wp_name", length = 50, unique = true, nullable = false)
    @Comment("근무지명")
    private String wpName;

    @Column(name = "wp_address", length = 100, unique = true, nullable = false)
    @Comment("주소")
    private String wpAddress;

    @Column(name = "wp_address_details", length = 255)
    @Comment("상세 주소")
    private String wpAddressDetails;

    @CreatedDate
    @Column(name = "wp_created_at", nullable = false, updatable = false)
    @Comment("생성 일시")
    private LocalDateTime wpCreatedAt;

    @LastModifiedDate
    @Column(name = "wp_updated_at", nullable = false)
    @Comment("수정 일시")
    private LocalDateTime wpUpdatedAt;
}
