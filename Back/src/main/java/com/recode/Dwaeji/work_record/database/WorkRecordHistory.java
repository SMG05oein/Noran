package com.recode.Dwaeji.work_record.database;

import com.recode.Dwaeji.user.database.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "Work_record_history")
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
    private Long wrhIdx;

    @Column(name = "fk_wr_idx", nullable = false)
    private Long wrIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_admin_idx", nullable = false)
    private User adminUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_target_user_idx", nullable = false)
    private User targetUser;

    @Column(name = "wr_date", nullable = false)
    private LocalDate wrDate;

    @Column(name = "before_start_time")
    private LocalTime beforeStartTime;

    @Column(name = "before_end_time")
    private LocalTime beforeEndTime;

    @Column(name = "before_rest_time")
    private LocalTime beforeRestTime;

    @Column(name = "after_start_time")
    private LocalTime afterStartTime;

    @Column(name = "after_end_time")
    private LocalTime afterEndTime;

    @Column(name = "after_rest_time")
    private LocalTime afterRestTime;

    @CreatedDate
    @Column(name = "wrh_created_at", nullable = false, updatable = false)
    private LocalDateTime wrhCreatedAt;
}
