package com.recode.Dwaeji.work_record.database;

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
import java.time.LocalTime;

@Entity
@Table(
        name = "Work_record",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_work_record_user_date_wp",
                columnNames = {"fk_user_idx", "wr_date", "fk_work_place_idx"}
        )
)
@Comment("근무 기록")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class WorkRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wr_idx")
    @Comment("근무 기록 PK")
    private Long wrIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false)
    @Comment("사용자 FK")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_work_place_idx")
    @Comment("근무지 FK")
    private WorkPlace workPlace;

    @Column(name = "wr_date", nullable = false)
    @Comment("근무일")
    private LocalDate wrDate;

    @Column(name = "wr_start_time", nullable = false)
    @Comment("출근 시각")
    private LocalTime wrStartTime;

    @Column(name = "wr_end_time", nullable = false)
    @Comment("퇴근 시각")
    private LocalTime wrEndTime;

    @Column(name = "wr_rest_time", nullable = false)
    @Comment("휴게 시간")
    private LocalTime wrRestTime;

    @Column(name = "wr_remarks", length = 255)
    @Comment("근무 비고")
    private String wrRemarks;

    @Column(name = "wr_created_by")
    @Comment("등록자 userIdx (관리자 대리 등록 시 관리자)")
    private Long wrCreatedBy;

    @CreatedDate
    @Column(name = "wr_created_at", nullable = false, updatable = false)
    @Comment("생성 일시")
    private LocalDateTime wrCreatedAt;

    @LastModifiedDate
    @Column(name = "wr_updated_at", nullable = false)
    @Comment("수정 일시")
    private LocalDateTime wrUpdatedAt;
}
