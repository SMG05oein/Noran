package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "User_type")
@Comment("사용자 유형")
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
    @Comment("사용자 유형 PK")
    private Long utIdx;

    @Column(name = "ut_name", length = 20)
    @Comment("유형명")
    private String utName;

    @Builder.Default
    @Column(name = "ut_is_admin", columnDefinition = "TINYINT")
    @Comment("관리자 여부")
    private Integer utIsAdmin = 0;

    @Builder.Default
    @Column(name = "ut_is_super_admin", columnDefinition = "TINYINT")
    @Comment("슈퍼관리자 여부")
    private Integer utIsSuperAdmin = 0;

    @Builder.Default
    @Column(name = "ut_can_access_archive", columnDefinition = "TINYINT")
    @Comment("아카이브 접근 권한")
    private Integer utCanAccessArchive = 0;

    @Builder.Default
    @Column(name = "ut_can_view_sensitive", columnDefinition = "TINYINT")
    @Comment("민감정보 조회 권한")
    private Integer utCanViewSensitive = 0;

    @Builder.Default
    @Column(name = "ut_can_edit_sensitive", columnDefinition = "TINYINT")
    @Comment("민감정보 수정 권한")
    private Integer utCanEditSensitive = 0;

    @Builder.Default
    @Column(name = "ut_can_export_excel", columnDefinition = "TINYINT")
    @Comment("엑셀 내보내기 권한")
    private Integer utCanExportExcel = 0;

    @Builder.Default
    @Column(name = "ut_can_manage_roles", columnDefinition = "TINYINT")
    @Comment("역할 관리 권한")
    private Integer utCanManageRoles = 0;

    @Builder.Default
    @Column(name = "ut_allow_multi_workplace", columnDefinition = "TINYINT")
    @Comment("복수 지점 허용")
    private Integer utAllowMultiWorkplace = 0;

    @Builder.Default
    @Column(name = "ut_can_manage_schedule", columnDefinition = "TINYINT")
    @Comment("스케줄 관리 권한")
    private Integer utCanManageSchedule = 0;

    @CreatedDate
    @Column(name = "ut_created_at", nullable = false, updatable = false)
    @Comment("생성 일시")
    private LocalDateTime utCreatedAt;

    @LastModifiedDate
    @Column(name = "ut_updated_at", nullable = false)
    @Comment("수정 일시")
    private LocalDateTime utUpdatedAt;
}
