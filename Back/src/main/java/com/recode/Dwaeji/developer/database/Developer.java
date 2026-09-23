package com.recode.Dwaeji.developer.database;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "Developer")
@Comment("개발자 계정")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Developer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dev_idx")
    @Comment("개발자 PK")
    private Long devIdx;

    @Column(name = "dev_id", length = 50, unique = true, nullable = false)
    @Comment("로그인 아이디")
    private String devId;

    @Column(name = "dev_pw", length = 255, nullable = false)
    @Comment("비밀번호")
    private String devPw;

    @Column(name = "dev_name", length = 50, nullable = false)
    @Comment("개발자 이름")
    private String devName;

    @Column(name = "dev_is_active", columnDefinition = "TINYINT")
    @Builder.Default
    @Comment("활성 여부")
    private Integer devIsActive = 1;

    @Builder.Default
    @Column(name = "dev_is_temp_pw", columnDefinition = "TINYINT")
    @Comment("임시 비밀번호 여부")
    private Integer devIsTempPw = 0; // 0: 일반 비번, 1: 임시 비번 상태

    @Column(name = "dev_temp_pw", length = 255)
    @Comment("임시 비밀번호")
    private String devTempPw; // 임시 비번 (암호화 안 함)

    @CreatedDate
    @Column(name = "dev_created_at", nullable = false, updatable = false)
    @Comment("생성 일시")
    private LocalDateTime devCreatedAt;

    @LastModifiedDate
    @Column(name = "dev_updated_at", nullable = false)
    @Comment("수정 일시")
    private LocalDateTime devUpdatedAt;
}
