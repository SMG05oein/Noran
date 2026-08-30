package com.recode.Dwaeji.work_record.repository;

import com.recode.Dwaeji.work_record.database.WorkRecordHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WorkRecordHistoryRepository extends JpaRepository<WorkRecordHistory, Long> {
    List<WorkRecordHistory> findByTargetUser_UserIdxAndWrDate(Long userIdx, LocalDate wrDate);
    List<WorkRecordHistory> findByWrDate(LocalDate wrDate);

    @org.springframework.data.jpa.repository.Query("SELECT h FROM WorkRecordHistory h WHERE " +
           "(:year IS NULL OR YEAR(h.wrDate) = :year) AND " +
           "(:month IS NULL OR MONTH(h.wrDate) = :month) AND " +
           "(:keyword IS NULL OR h.targetUser.userName LIKE %:keyword% OR h.adminUser.userName LIKE %:keyword%)")
    org.springframework.data.domain.Page<WorkRecordHistory> searchHistory(
            @org.springframework.data.repository.query.Param("year") Integer year,
            @org.springframework.data.repository.query.Param("month") Integer month,
            @org.springframework.data.repository.query.Param("keyword") String keyword,
            org.springframework.data.domain.Pageable pageable);
}
