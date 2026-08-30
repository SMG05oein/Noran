package com.recode.Dwaeji.work_record.repository;

import com.recode.Dwaeji.work_record.database.WorkRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WorkRecordRepository extends JpaRepository<WorkRecord, Long> {

    // --- JOIN FETCH 쿼리 (N+1 방지) ---
    @Query(value = "SELECT r FROM WorkRecord r JOIN FETCH r.user u JOIN FETCH u.workPlace WHERE u.userIdx = :userIdx",
           countQuery = "SELECT COUNT(r) FROM WorkRecord r WHERE r.user.userIdx = :userIdx")
    Page<WorkRecord> findByUserIdxFetch(@Param("userIdx") Long userIdx, Pageable pageable);

    @Query("SELECT r FROM WorkRecord r JOIN FETCH r.user u JOIN FETCH u.workPlace WHERE u.userIdx = :userIdx AND r.wrDate BETWEEN :startDate AND :endDate ORDER BY r.wrDate DESC")
    List<WorkRecord> findByUserIdxAndDateBetweenFetch(@Param("userIdx") Long userIdx, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query(value = "SELECT r FROM WorkRecord r JOIN FETCH r.user u JOIN FETCH u.workPlace WHERE u.workPlace.wpIdx = :wpIdx",
           countQuery = "SELECT COUNT(r) FROM WorkRecord r WHERE r.user.workPlace.wpIdx = :wpIdx")
    Page<WorkRecord> findByWorkPlaceIdxFetch(@Param("wpIdx") Long wpIdx, Pageable pageable);

    @Query(value = "SELECT r FROM WorkRecord r JOIN FETCH r.user u JOIN FETCH u.workPlace WHERE u.userName LIKE %:userName%",
           countQuery = "SELECT COUNT(r) FROM WorkRecord r WHERE r.user.userName LIKE %:userName%")
    Page<WorkRecord> findByUserNameFetch(@Param("userName") String userName, Pageable pageable);

    @Query(value = "SELECT r FROM WorkRecord r JOIN FETCH r.user u JOIN FETCH u.workPlace WHERE u.workPlace.wpIdx = :wpIdx AND u.userName LIKE %:userName%",
           countQuery = "SELECT COUNT(r) FROM WorkRecord r WHERE r.user.workPlace.wpIdx = :wpIdx AND r.user.userName LIKE %:userName%")
    Page<WorkRecord> findByWorkPlaceIdxAndUserNameFetch(@Param("wpIdx") Long wpIdx, @Param("userName") String userName, Pageable pageable);

    @Query(value = "SELECT r FROM WorkRecord r JOIN FETCH r.user u JOIN FETCH u.workPlace WHERE r.wrDate BETWEEN :startDate AND :endDate",
           countQuery = "SELECT COUNT(r) FROM WorkRecord r WHERE r.wrDate BETWEEN :startDate AND :endDate")
    Page<WorkRecord> findByDateBetweenFetch(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate, Pageable pageable);

    @Query(value = "SELECT r FROM WorkRecord r JOIN FETCH r.user u JOIN FETCH u.workPlace WHERE r.wrDate BETWEEN :startDate AND :endDate AND u.workPlace.wpIdx = :wpIdx",
           countQuery = "SELECT COUNT(r) FROM WorkRecord r WHERE r.wrDate BETWEEN :startDate AND :endDate AND r.user.workPlace.wpIdx = :wpIdx")
    Page<WorkRecord> findByDateBetweenAndWorkPlaceFetch(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate, @Param("wpIdx") Long wpIdx, Pageable pageable);

    @Query(value = "SELECT r FROM WorkRecord r JOIN FETCH r.user u JOIN FETCH u.workPlace WHERE r.wrDate BETWEEN :startDate AND :endDate AND u.userName LIKE %:userName%",
           countQuery = "SELECT COUNT(r) FROM WorkRecord r WHERE r.wrDate BETWEEN :startDate AND :endDate AND r.user.userName LIKE %:userName%")
    Page<WorkRecord> findByDateBetweenAndUserNameFetch(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate, @Param("userName") String userName, Pageable pageable);

    @Query(value = "SELECT r FROM WorkRecord r JOIN FETCH r.user u JOIN FETCH u.workPlace WHERE r.wrDate BETWEEN :startDate AND :endDate AND u.workPlace.wpIdx = :wpIdx AND u.userName LIKE %:userName%",
           countQuery = "SELECT COUNT(r) FROM WorkRecord r WHERE r.wrDate BETWEEN :startDate AND :endDate AND r.user.workPlace.wpIdx = :wpIdx AND r.user.userName LIKE %:userName%")
    Page<WorkRecord> findByDateBetweenAndWorkPlaceAndUserNameFetch(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate, @Param("wpIdx") Long wpIdx, @Param("userName") String userName, Pageable pageable);

    // --- 기존 메서드 (하위 호환) ---
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
