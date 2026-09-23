package com.recode.Dwaeji.developer.database;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "Announcement")
@Comment("공지사항")
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
    @Comment("공지 PK")
    private Long annIdx;

    @Column(name = "ann_title", nullable = false, length = 150)
    @Comment("제목")
    private String annTitle;

    @Column(name = "ann_content", nullable = false, columnDefinition = "TEXT")
    @Comment("내용")
    private String annContent;

    @Column(name = "ann_is_active", columnDefinition = "TINYINT")
    @Builder.Default
    @Comment("활성 여부")
    private Integer annIsActive = 1;

    @Column(name = "ann_start_date")
    @Comment("게시 시작일")
    private java.time.LocalDate annStartDate;

    @Column(name = "ann_end_date")
    @Comment("게시 종료일")
    private java.time.LocalDate annEndDate;

    @CreatedDate
    @Column(name = "ann_created_at", nullable = false, updatable = false)
    @Comment("생성 일시")
    private LocalDateTime annCreatedAt;

    @LastModifiedDate
    @Column(name = "ann_updated_at", nullable = false)
    @Comment("수정 일시")
    private LocalDateTime annUpdatedAt;
}
