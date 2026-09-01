package com.recode.Dwaeji.work_apply_work.database;

import com.recode.Dwaeji.user.database.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_apply")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class WorkApply {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wa_idx")
    private Long waIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false)
    private User user;

    @Column(name = "wa_date", nullable = false)
    private LocalDate waDate; // 해당 주의 월요일 날짜

    @Column(name = "wa_is_mon", nullable = false)
    private boolean waIsMon;

    @Column(name = "wa_is_tue", nullable = false)
    private boolean waIsTue;

    @Column(name = "wa_is_wed", nullable = false)
    private boolean waIsWed;

    @Column(name = "wa_is_thu", nullable = false)
    private boolean waIsThu;

    @Column(name = "wa_is_fri", nullable = false)
    private boolean waIsFri;

    @Column(name = "wa_is_sat", nullable = false)
    private boolean waIsSat;

    @Column(name = "wa_is_sun", nullable = false)
    private boolean waIsSun;

    @Column(name = "wa_remarks", columnDefinition = "TEXT")
    private String waRemarks;

    @CreatedDate
    @Column(name = "wa_created_at", nullable = false, updatable = false)
    private LocalDateTime waCreatedAt;

    @LastModifiedDate
    @Column(name = "wa_updated_at", nullable = false)
    private LocalDateTime waUpdatedAt;
}
