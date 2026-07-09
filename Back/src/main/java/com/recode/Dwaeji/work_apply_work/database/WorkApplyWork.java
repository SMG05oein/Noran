package com.recode.Dwaeji.work_apply_work.database;

import com.recode.Dwaeji.user.database.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "Work_apply_work")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class WorkApplyWork {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "waw_idx")
    private Long wawIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false)
    private User user;

    @Column(name = "waw_date", nullable = false)
    private LocalDate wawDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "waw_is_mon", nullable = false, columnDefinition = "enum('미신청','반려','배정','신청')")
    private ApplyStatus wawIsMon;

    @Enumerated(EnumType.STRING)
    @Column(name = "waw_is_tue", nullable = false, columnDefinition = "enum('미신청','반려','배정','신청')")
    private ApplyStatus wawIsTue;

    @Enumerated(EnumType.STRING)
    @Column(name = "waw_is_wed", nullable = false, columnDefinition = "enum('미신청','반려','배정','신청')")
    private ApplyStatus wawIsWed;

    @Enumerated(EnumType.STRING)
    @Column(name = "waw_is_thu", nullable = false, columnDefinition = "enum('미신청','반려','배정','신청')")
    private ApplyStatus wawIsThu;

    @Enumerated(EnumType.STRING)
    @Column(name = "waw_is_fri", nullable = false, columnDefinition = "enum('미신청','반려','배정','신청')")
    private ApplyStatus wawIsFri;

    @Enumerated(EnumType.STRING)
    @Column(name = "waw_is_sat", nullable = false, columnDefinition = "enum('미신청','반려','배정','신청')")
    private ApplyStatus wawIsSat;

    @Enumerated(EnumType.STRING)
    @Column(name = "waw_is_sun", nullable = false, columnDefinition = "enum('미신청','반려','배정','신청')")
    private ApplyStatus wawIsSun;

    @Column(name = "waw_mon_start_time")
    private LocalTime wawMonStartTime;

    @Column(name = "waw_tue_start_time")
    private LocalTime wawTueStartTime;

    @Column(name = "waw_wed_start_time")
    private LocalTime wawWedStartTime;

    @Column(name = "waw_thu_start_time")
    private LocalTime wawThuStartTime;

    @Column(name = "waw_fri_start_time")
    private LocalTime wawFriStartTime;

    @Column(name = "waw_sat_start_time")
    private LocalTime wawSatStartTime;

    @Column(name = "waw_sun_start_time")
    private LocalTime wawSunStartTime;

    @Column(name = "waw_remarks", columnDefinition = "TEXT")
    private String wawRemarks;

    @CreatedDate
    @Column(name = "waw_created_at", nullable = false, updatable = false)
    private LocalDateTime wawCreatedAt;

    @LastModifiedDate
    @Column(name = "waw_updated_at", nullable = false)
    private LocalDateTime wawUpdatedAt;
}
