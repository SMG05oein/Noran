package com.recode.Dwaeji.work_apply_work.repository;

import com.recode.Dwaeji.work_apply_work.database.WorkApplyWork;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkApplyWorkRepository extends JpaRepository<WorkApplyWork, Long> {
    Page<WorkApplyWork> findByUser_UserIdx(Long userIdx, Pageable pageable);
    List<WorkApplyWork> findByUser_UserIdx(Long userIdx);
    Page<WorkApplyWork> findByUser_UserIdxAndWawDate(Long userIdx, LocalDate wawDate, Pageable pageable);
    
    Page<WorkApplyWork> findByUser_WorkPlace_WpIdx(Long wpIdx, Pageable pageable);
    Page<WorkApplyWork> findByUser_WorkPlace_WpIdxAndWawDate(Long wpIdx, LocalDate wawDate, Pageable pageable);
    List<WorkApplyWork> findByUser_WorkPlace_WpIdxAndWawDate(Long wpIdx, LocalDate wawDate);
    List<WorkApplyWork> findByWawDate(LocalDate wawDate);
    
    Page<WorkApplyWork> findByWawDate(LocalDate wawDate, Pageable pageable);
    
    List<WorkApplyWork> findByUser_WorkPlace_WpIdxAndWawDateBetween(Long wpIdx, LocalDate startDate, LocalDate endDate);
    List<WorkApplyWork> findByWawDateBetween(LocalDate startDate, LocalDate endDate);
    boolean existsByUser_UserIdxAndWawDate(Long userIdx, LocalDate wawDate);
    Optional<WorkApplyWork> findByUser_UserIdxAndWawDate(Long userIdx, LocalDate wawDate);
    void deleteByUser_UserIdx(Long userIdx);

    // WorkApplyWork 조회 시 User + WorkPlace JOIN FETCH (N+1 방지)
    @Query("SELECT a FROM WorkApplyWork a JOIN FETCH a.user u LEFT JOIN FETCH u.workPlace WHERE a.wawDate = :wawDate")
    List<WorkApplyWork> findByWawDateFetch(@Param("wawDate") LocalDate wawDate);

    // WorkRecord 배치 조회용: 여러 userIdx + 하나의 monday
    @Query("SELECT a FROM WorkApplyWork a JOIN FETCH a.user u WHERE u.userIdx IN :userIdxList AND a.wawDate = :wawDate")
    List<WorkApplyWork> findByUserIdxInAndWawDate(@Param("userIdxList") List<Long> userIdxList, @Param("wawDate") LocalDate wawDate);

    @Query("SELECT a FROM WorkApplyWork a JOIN FETCH a.user u LEFT JOIN FETCH u.workPlace WHERE u.userIdx = :userIdx AND a.wawDate BETWEEN :startDate AND :endDate ORDER BY a.wawDate DESC")
    List<WorkApplyWork> findByUserIdxAndWawDateBetweenFetch(@Param("userIdx") Long userIdx, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
