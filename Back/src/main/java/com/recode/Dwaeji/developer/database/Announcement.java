package com.recode.Dwaeji.developer.database;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "Announcement", comment = "공지사항")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ann_idx", comment = "공지 PK")
    private Long annIdx;

    @Column(name = "ann_title", nullable = false, length = 150, comment = "제목")
    private String annTitle;

    @Column(name = "ann_content", nullable = false, columnDefinition = "TEXT", comment = "내용")
    private String annContent;

    @Column(name = "ann_is_active", columnDefinition = "TINYINT", comment = "활성 여부")
    @Builder.Default
    private Integer annIsActive = 1;

    @Column(name = "ann_start_date", comment = "게시 시작일")
    private java.time.LocalDate annStartDate;

    @Column(name = "ann_end_date", comment = "게시 종료일")
    private java.time.LocalDate annEndDate;

    @CreatedDate
    @Column(name = "ann_created_at", nullable = false, updatable = false, comment = "생성 일시")
    private LocalDateTime annCreatedAt;

    @LastModifiedDate
    @Column(name = "ann_updated_at", nullable = false, comment = "수정 일시")
    private LocalDateTime annUpdatedAt;
}
