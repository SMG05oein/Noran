package com.recode.Dwaeji.work_record.database;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.database.WorkPlace;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "Work_record")
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
    private Long wrIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_work_place_idx")
    private WorkPlace workPlace;

    @Column(name = "wr_date", nullable = false)
    private LocalDate wrDate;

    @Column(name = "wr_start_time", nullable = false)
    private LocalTime wrStartTime;

    @Column(name = "wr_end_time", nullable = false)
    private LocalTime wrEndTime;

    @Column(name = "wr_rest_time", nullable = false)
    private LocalTime wrRestTime;

    @Column(name = "wr_remarks", columnDefinition = "TEXT")
    private String wrRemarks;

    @CreatedDate
    @Column(name = "wr_created_at", nullable = false, updatable = false)
    private LocalDateTime wrCreatedAt;

    @LastModifiedDate
    @Column(name = "wr_updated_at", nullable = false)
    private LocalDateTime wrUpdatedAt;
}
