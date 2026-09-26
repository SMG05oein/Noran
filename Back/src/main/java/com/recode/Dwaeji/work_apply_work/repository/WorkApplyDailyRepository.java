package com.recode.Dwaeji.work_apply_work.repository;

import com.recode.Dwaeji.work_apply_work.database.WorkApplyDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface WorkApplyDailyRepository extends JpaRepository<WorkApplyDaily, Long> {

    @Query("SELECT w FROM WorkApplyDaily w JOIN FETCH w.user u LEFT JOIN FETCH u.workPlace LEFT JOIN FETCH w.workPlace WHERE u.userIdx = :userIdx AND w.wadDate BETWEEN :startDate AND :endDate")
    List<WorkApplyDaily> findByUserIdxAndWadDateBetweenFetch(@Param("userIdx") Long userIdx, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT w FROM WorkApplyDaily w JOIN FETCH w.user u LEFT JOIN FETCH u.workPlace LEFT JOIN FETCH w.workPlace WHERE w.wadDate BETWEEN :startDate AND :endDate")
    List<WorkApplyDaily> findByWadDateBetweenFetch(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    boolean existsByUser_UserIdxAndWadDate(Long userIdx, LocalDate date);
    
    List<WorkApplyDaily> findByUser_UserIdxInAndWadDate(List<Long> userIdxes, LocalDate date);
    java.util.Optional<WorkApplyDaily> findByUser_UserIdxAndWadDate(Long userIdx, LocalDate date);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM WorkApplyDaily w WHERE w.user = :user AND w.wadDate BETWEEN :startDate AND :endDate")
    void deleteByUserAndWadDateBetween(@Param("user") com.recode.Dwaeji.user.database.User user,
                                       @Param("startDate") LocalDate startDate,
                                       @Param("endDate") LocalDate endDate);

    void deleteByUserAndWadDateIn(com.recode.Dwaeji.user.database.User user, List<LocalDate> dates);
    void deleteByUser_UserIdx(Long userIdx);
}
