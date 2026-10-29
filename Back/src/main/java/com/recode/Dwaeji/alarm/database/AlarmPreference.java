package com.recode.Dwaeji.alarm.database;

import com.recode.Dwaeji.user.database.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "alarm_preference", comment = "웹 푸시 알람 설정")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class AlarmPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ap_idx", comment = "알람 설정 PK")
    private Long apIdx;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false, unique = true, comment = "사용자 FK")
    private User user;

    @Builder.Default
    @Column(name = "missing_record_enabled", nullable = false, columnDefinition = "TINYINT(1)", comment = "근무 기록 누락 알람")
    private Boolean missingRecordEnabled = false;

    @Builder.Default
    @Column(name = "missing_record_time", nullable = false, comment = "누락 알람 시각(익일)")
    private LocalTime missingRecordTime = LocalTime.of(22, 0);

    @Builder.Default
    @Column(name = "assign_confirm_enabled", nullable = false, columnDefinition = "TINYINT(1)", comment = "배정 확정 알람")
    private Boolean assignConfirmEnabled = false;

    @Builder.Default
    @Column(name = "apply_deadline_enabled", nullable = false, columnDefinition = "TINYINT(1)", comment = "신청 마감 임박 알람")
    private Boolean applyDeadlineEnabled = false;

    @Builder.Default
    @Column(name = "apply_deadline_fri_time", nullable = false, comment = "신청 마감 알람(금)")
    private LocalTime applyDeadlineFriTime = LocalTime.of(22, 0);

    @Builder.Default
    @Column(name = "apply_deadline_sat_time", nullable = false, comment = "신청 마감 알람(토)")
    private LocalTime applyDeadlineSatTime = LocalTime.of(22, 0);

    @Builder.Default
    @Column(name = "apply_deadline_sun_time", nullable = false, comment = "신청 마감 알람(일)")
    private LocalTime applyDeadlineSunTime = LocalTime.of(12, 0);

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public boolean anyEnabled() {
        return Boolean.TRUE.equals(missingRecordEnabled)
                || Boolean.TRUE.equals(assignConfirmEnabled)
                || Boolean.TRUE.equals(applyDeadlineEnabled);
    }
}
