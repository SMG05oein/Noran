package com.recode.Dwaeji.work_record.database;

import com.recode.Dwaeji.user.database.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "Work_record_history")
@Comment("근무 기록 변경 이력")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class WorkRecordHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wrh_idx")
    @Comment("이력 PK")
    private Long wrhIdx;

    @Column(name = "fk_wr_idx", nullable = false)
    @Comment("근무 기록 FK")
    private Long wrIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_admin_idx", nullable = false)
    @Comment("수정 관리자 FK")
    private User adminUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_target_user_idx", nullable = false)
    @Comment("대상 사용자 FK")
    private User targetUser;

    @Column(name = "wr_date", nullable = false)
    @Comment("근무일")
    private LocalDate wrDate;

    @Column(name = "before_start_time")
    @Comment("변경 전 출근 시각")
    private LocalTime beforeStartTime;

    @Column(name = "before_end_time")
    @Comment("변경 전 퇴근 시각")
    private LocalTime beforeEndTime;

    @Column(name = "before_rest_time")
    @Comment("변경 전 휴게 시간")
    private LocalTime beforeRestTime;

    @Column(name = "after_start_time")
    @Comment("변경 후 출근 시각")
    private LocalTime afterStartTime;

    @Column(name = "after_end_time")
    @Comment("변경 후 퇴근 시각")
    private LocalTime afterEndTime;

    @Column(name = "after_rest_time")
    @Comment("변경 후 휴게 시간")
    private LocalTime afterRestTime;

    @Column(name = "action_type", length = 10)
    @Comment("CREATE | UPDATE | DELETE | RESTORE")
    private String actionType;

    @CreatedDate
    @Column(name = "wrh_created_at", nullable = false, updatable = false)
    @Comment("생성 일시")
    private LocalDateTime wrhCreatedAt;
}
