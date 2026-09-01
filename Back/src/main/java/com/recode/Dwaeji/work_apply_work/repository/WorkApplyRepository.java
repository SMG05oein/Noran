package com.recode.Dwaeji.work_apply_work.repository;

import com.recode.Dwaeji.work_apply_work.database.WorkApply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkApplyRepository extends JpaRepository<WorkApply, Long> {
    Optional<WorkApply> findByUser_UserIdxAndWaDate(Long userIdx, LocalDate waDate);
    List<WorkApply> findByUser_UserIdx(Long userIdx);
    
    List<WorkApply> findByUser_WorkPlace_WpIdxAndWaDate(Long wpIdx, LocalDate waDate);
    List<WorkApply> findByWaDate(LocalDate waDate);
    List<WorkApply> findByWaDateBetween(LocalDate startDate, LocalDate endDate);
    void deleteByUser_UserIdx(Long userIdx);

    @Query("SELECT a FROM WorkApply a JOIN FETCH a.user u WHERE u.userIdx IN :userIdxList AND a.waDate = :waDate")
    List<WorkApply> findByUserIdxInAndWaDate(@Param("userIdxList") List<Long> userIdxList, @Param("waDate") LocalDate waDate);

    // WorkApply 조회 시 User + WorkPlace JOIN FETCH (N+1 방지)
    @Query("SELECT a FROM WorkApply a JOIN FETCH a.user u LEFT JOIN FETCH u.workPlace WHERE a.waDate = :waDate")
    List<WorkApply> findByWaDateFetch(@Param("waDate") LocalDate waDate);

    @Query("SELECT a FROM WorkApply a JOIN FETCH a.user u LEFT JOIN FETCH u.workPlace WHERE u.userIdx = :userIdx AND a.waDate BETWEEN :startDate AND :endDate ORDER BY a.waDate DESC")
    List<WorkApply> findByUserIdxAndWaDateBetweenFetch(@Param("userIdx") Long userIdx, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
