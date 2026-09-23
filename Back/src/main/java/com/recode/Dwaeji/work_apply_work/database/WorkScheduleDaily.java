package com.recode.Dwaeji.work_apply_work.database;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.database.WorkPlace;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "Work_schedule_daily")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class WorkScheduleDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wsd_idx")
    private Long wsdIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false)
    private User user;

    @Column(name = "wsd_date", nullable = false)
    private LocalDate wsdDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "wsd_status", nullable = false, columnDefinition = "enum('출근','미출근','신청')")
    private ApplyStatus wsdStatus;

    @Column(name = "wsd_start_time")
    private String wsdStartTime; // "10:00" or "오픈"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_work_place_idx")
    private WorkPlace workPlace;

    @Column(name = "wsd_is_confirmed", nullable = false)
    @Builder.Default
    private Boolean wsdIsConfirmed = false;

    @Column(name = "wsd_is_open", nullable = false)
    @Builder.Default
    private Boolean wsdIsOpen = false;


    @CreatedDate
    @Column(name = "wsd_created_at", nullable = false, updatable = false)
    private LocalDateTime wsdCreatedAt;

    @LastModifiedDate
    @Column(name = "wsd_updated_at", nullable = false)
    private LocalDateTime wsdUpdatedAt;
}
