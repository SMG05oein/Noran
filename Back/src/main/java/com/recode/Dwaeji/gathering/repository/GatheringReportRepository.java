package com.recode.Dwaeji.gathering.repository;

import com.recode.Dwaeji.gathering.database.GatheringReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GatheringReportRepository extends JpaRepository<GatheringReport, Long> {
    List<GatheringReport> findByPostId(Long postId);
    List<GatheringReport> findByCommentId(Long commentId);
    List<GatheringReport> findByStatusOrderByCreatedAtDesc(String status);
    Page<GatheringReport> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<GatheringReport> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    void deleteByUser_UserIdx(Long userIdx);
}
