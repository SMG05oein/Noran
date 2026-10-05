package com.recode.Dwaeji.work_apply_work.database;

import com.recode.Dwaeji.user.database.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_apply")
@Comment("주간 근무 신청")
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
    @Comment("주간 신청 PK")
    private Long waIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false)
    @Comment("사용자 FK")
    private User user;

    @Column(name = "wa_date", nullable = false)
    @Comment("주 시작일(월요일)")
    private LocalDate waDate; // 해당 주의 월요일 날짜


    @Column(name = "wa_remarks", columnDefinition = "TEXT")
    @Comment("신청 비고")
    private String waRemarks;

    @CreatedDate
    @Column(name = "wa_created_at", nullable = false, updatable = false)
    @Comment("생성 일시")
    private LocalDateTime waCreatedAt;

    @LastModifiedDate
    @Column(name = "wa_updated_at", nullable = false)
    @Comment("수정 일시")
    private LocalDateTime waUpdatedAt;
}
