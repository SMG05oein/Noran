package com.recode.Dwaeji.work_apply_work.repository;

import com.recode.Dwaeji.work_apply_work.database.WorkScheduleDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface WorkScheduleDailyRepository extends JpaRepository<WorkScheduleDaily, Long> {

    @Query("SELECT w FROM WorkScheduleDaily w JOIN FETCH w.user u LEFT JOIN FETCH u.workPlace LEFT JOIN FETCH w.workPlace WHERE u.userIdx = :userIdx AND w.wsdDate BETWEEN :startDate AND :endDate")
    List<WorkScheduleDaily> findByUserIdxAndWsdDateBetweenFetch(@Param("userIdx") Long userIdx, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT w FROM WorkScheduleDaily w JOIN FETCH w.user u LEFT JOIN FETCH u.workPlace LEFT JOIN FETCH w.workPlace WHERE w.wsdDate BETWEEN :startDate AND :endDate")
    List<WorkScheduleDaily> findByWsdDateBetweenFetch(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    boolean existsByUser_UserIdxAndWsdDate(Long userIdx, LocalDate date);
    
    List<WorkScheduleDaily> findByUser_UserIdxInAndWsdDate(List<Long> userIdxes, LocalDate date);
    java.util.Optional<WorkScheduleDaily> findByUser_UserIdxAndWsdDate(Long userIdx, LocalDate date);
    void deleteByUser_UserIdx(Long userIdx);
}
