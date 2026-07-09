package com.recode.Dwaeji.work_record.repository;

import com.recode.Dwaeji.work_record.database.WorkRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WorkRecordRepository extends JpaRepository<WorkRecord, Long> {
    Page<WorkRecord> findByUser_UserIdx(Long userIdx, Pageable pageable);
    Page<WorkRecord> findByUser_WorkPlace_WpIdx(Long wpIdx, Pageable pageable);
    Page<WorkRecord> findByUser_UserNameContaining(String userName, Pageable pageable);
    Page<WorkRecord> findByUser_WorkPlace_WpIdxAndUser_UserNameContaining(Long wpIdx, String userName, Pageable pageable);
    
    Page<WorkRecord> findByWrDateBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);
    Page<WorkRecord> findByWrDateBetweenAndUser_WorkPlace_WpIdx(LocalDate startDate, LocalDate endDate, Long wpIdx, Pageable pageable);
    Page<WorkRecord> findByWrDateBetweenAndUser_UserNameContaining(LocalDate startDate, LocalDate endDate, String userName, Pageable pageable);
    Page<WorkRecord> findByWrDateBetweenAndUser_WorkPlace_WpIdxAndUser_UserNameContaining(LocalDate startDate, LocalDate endDate, Long wpIdx, String userName, Pageable pageable);

    // For Excel Download
    List<WorkRecord> findByWrDateBetween(LocalDate startDate, LocalDate endDate);
    List<WorkRecord> findByUser_WorkPlace_WpIdxAndWrDateBetween(Long wpIdx, LocalDate startDate, LocalDate endDate);

    boolean existsByUser_UserIdxAndWrDate(Long userIdx, LocalDate wrDate);
    void deleteByUser_UserIdx(Long userIdx);
}

