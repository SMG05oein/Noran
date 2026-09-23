package com.recode.Dwaeji.work_apply_work.database;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.database.WorkPlace;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "Work_apply_daily")
@Comment("일별 근무 신청")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class WorkApplyDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wad_idx")
    @Comment("일별 신청 PK")
    private Long wadIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false)
    @Comment("사용자 FK")
    private User user;

    @Column(name = "wad_date", nullable = false)
    @Comment("신청일")
    private LocalDate wadDate;

    @Column(name = "wad_is_open", nullable = false)
    @Builder.Default
    @Comment("오픈조 지원 여부")
    private boolean wadIsOpen = false; // 오픈조 지원 여부

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_work_place_idx")
    @Comment("근무지 FK")
    private WorkPlace workPlace; // 복수 지점 지원 대응

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_wa_idx")
    @Comment("주간 신청 FK")
    private WorkApply workApply; // 주간 비고용 부모 테이블

    @CreatedDate
    @Column(name = "wad_created_at", nullable = false, updatable = false)
    @Comment("생성 일시")
    private LocalDateTime wadCreatedAt;

    @LastModifiedDate
    @Column(name = "wad_updated_at", nullable = false)
    @Comment("수정 일시")
    private LocalDateTime wadUpdatedAt;
}
