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
@Table(name = "Work_schedule_daily", comment = "일별 근무 스케줄")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class WorkScheduleDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wsd_idx", comment = "일별 스케줄 PK")
    private Long wsdIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false, comment = "사용자 FK")
    private User user;

    @Column(name = "wsd_date", nullable = false, comment = "근무일")
    private LocalDate wsdDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "wsd_status", nullable = false, columnDefinition = "enum('출근','미출근','신청')", comment = "스케줄 상태")
    private ApplyStatus wsdStatus;

    @Column(name = "wsd_start_time", comment = "출근 시각")
    private String wsdStartTime; // "10:00" or "오픈"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_work_place_idx", comment = "근무지 FK")
    private WorkPlace workPlace;

    @Column(name = "wsd_is_confirmed", nullable = false, comment = "확정 여부")
    @Builder.Default
    private Boolean wsdIsConfirmed = false;

    @Column(name = "wsd_is_open", nullable = false, comment = "오픈조 여부")
    @Builder.Default
    private Boolean wsdIsOpen = false;

    @Column(name = "wsd_is_close", nullable = false, columnDefinition = "boolean default false", comment = "마감조 여부")
    @Builder.Default
    private Boolean wsdIsClose = false;

    @CreatedDate
    @Column(name = "wsd_created_at", nullable = false, updatable = false, comment = "생성 일시")
    private LocalDateTime wsdCreatedAt;

    @LastModifiedDate
    @Column(name = "wsd_updated_at", nullable = false, comment = "수정 일시")
    private LocalDateTime wsdUpdatedAt;
}
