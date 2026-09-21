package com.recode.Dwaeji.developer.database;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "Announcement")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ann_idx")
    private Long annIdx;

    @Column(name = "ann_title", nullable = false, length = 150)
    private String annTitle;

    @Column(name = "ann_content", nullable = false, columnDefinition = "TEXT")
    private String annContent;

    @Column(name = "ann_is_active", columnDefinition = "TINYINT")
    @Builder.Default
    private Integer annIsActive = 1;

    @Column(name = "ann_start_date")
    private java.time.LocalDate annStartDate;

    @Column(name = "ann_end_date")
    private java.time.LocalDate annEndDate;

    @CreatedDate
    @Column(name = "ann_created_at", nullable = false, updatable = false)
    private LocalDateTime annCreatedAt;

    @LastModifiedDate
    @Column(name = "ann_updated_at", nullable = false)
    private LocalDateTime annUpdatedAt;
}
