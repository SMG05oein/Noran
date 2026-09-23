package com.recode.Dwaeji.user.repository;

import com.recode.Dwaeji.user.database.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUserId(String userId);
    Optional<User> findByUserEmail(String userEmail);
    Optional<User> findByUserPhone(String userPhone);
    Optional<User> findByUserNameAndUserPhone(String userName, String userPhone);

    /** 하이픈 무시하고 휴대폰 번호 중복 여부 (excludeUserIdx가 있으면 해당 유저 제외) */
    @Query(value = "SELECT COUNT(*) FROM user u " +
            "WHERE REPLACE(IFNULL(u.user_phone, ''), '-', '') = :phoneDigits " +
            "  AND (:excludeUserIdx IS NULL OR u.user_idx <> :excludeUserIdx)",
           nativeQuery = true)
    long countByPhoneDigitsExcluding(
            @Param("phoneDigits") String phoneDigits,
            @Param("excludeUserIdx") Long excludeUserIdx);
    List<User> findByWorkPlace_WpIdx(Long wpIdx);
    
    // 아카이빙 대상자 조회 (비활성화 상태이고 탈퇴일이 특정 날짜 이전인 유저)
    @Query("SELECT u FROM User u WHERE u.userIsActive = 0 AND u.userWithdrawnAt IS NOT NULL AND u.userWithdrawnAt < :thresholdDate AND u.userName != '탈퇴자_비식별화'")
    List<User> findUsersToArchive(@org.springframework.data.repository.query.Param("thresholdDate") java.time.LocalDateTime thresholdDate);

    // --- 관리자 전용 알바생 조회 (Native Query 윈도우 함수 적용) ---
    @Query(value = "SELECT " +
                   "    numbered_u.user_idx as userIdx, " +
                   "    numbered_u.user_id as userId, " +
                   "    numbered_u.user_name as userName, " +
                   "    numbered_u.user_email as userEmail, " +
                   "    numbered_u.user_birth as userBirth, " +
                   "    numbered_u.user_phone as userPhone, " +
                   "    ut.ut_name as userTypeName, " +
                   "    numbered_u.fk_ut_idx as fkUtIdx, " +
                   "    wp.wp_name as workPlaceName, " +
                   "    numbered_u.fk_work_place_idx as workPlaceIdx, " +
                   "    numbered_u.user_is_active as userIsActive, " +
                   "    numbered_u.user_account_name as userAccountName, " +
                   "    numbered_u.user_account_number as userAccountNumber, " +
                   "    numbered_u.user_bank as userBank, " +
                   "    numbered_u.user_hourly_wage as userHourlyWage, " +
                   "    ut.ut_is_admin as isAdmin, " +
                   "    numbered_u.user_withdrawn_at as userWithdrawnAt, " +
                   "    numbered_u.nameSeq as nameSeq " +
                   "FROM ( " +
                   "    SELECT u.*, ROW_NUMBER() OVER (" +
                   "      PARTITION BY u.user_name " +
                   "      ORDER BY u.user_created_at ASC, u.user_idx ASC" +
                   "    ) as nameSeq " +
                   "    FROM user u " +
                   "    WHERE u.user_name <> '탈퇴자_비식별화' " +
                   "      AND (u.user_is_active IS NULL OR u.user_is_active <> 0) " +
                   ") numbered_u " +
                   "LEFT JOIN user_type ut ON numbered_u.fk_ut_idx = ut.ut_idx " +
                   "LEFT JOIN work_place wp ON numbered_u.fk_work_place_idx = wp.wp_idx " +
                   "WHERE ut.ut_is_admin = 0 " +
                   "  AND (:isActive IS NULL OR numbered_u.user_is_active = :isActive) " +
                   "  AND (:wpIdx IS NULL OR numbered_u.fk_work_place_idx = :wpIdx) " +
                   "  AND (:userName IS NULL OR numbered_u.user_name LIKE CONCAT('%', :userName, '%')) " +
                   "  AND numbered_u.user_name != '탈퇴자_비식별화' " +
                   "ORDER BY numbered_u.user_name ASC, numbered_u.user_idx ASC",
           countQuery = "SELECT count(*) " +
                        "FROM user numbered_u " +
                        "LEFT JOIN user_type ut ON numbered_u.fk_ut_idx = ut.ut_idx " +
                        "WHERE ut.ut_is_admin = 0 " +
                        "  AND (:isActive IS NULL OR numbered_u.user_is_active = :isActive) " +
                        "  AND (:wpIdx IS NULL OR numbered_u.fk_work_place_idx = :wpIdx) " +
                        "  AND (:userName IS NULL OR numbered_u.user_name LIKE CONCAT('%', :userName, '%')) " +
                        "  AND numbered_u.user_name != '탈퇴자_비식별화'",
           nativeQuery = true)
    Page<UserWithSeqProjection> searchWorkersNative(
            @Param("isActive") Integer isActive,
            @Param("wpIdx") Long wpIdx,
            @Param("userName") String userName,
            Pageable pageable);

    // --- 전체 직원(알바생+관리자) 조회 (Native Query 윈도우 함수 적용) ---
    @Query(value = "SELECT " +
                   "    numbered_u.user_idx as userIdx, " +
                   "    numbered_u.user_id as userId, " +
                   "    numbered_u.user_name as userName, " +
                   "    numbered_u.user_email as userEmail, " +
                   "    numbered_u.user_birth as userBirth, " +
                   "    numbered_u.user_phone as userPhone, " +
                   "    ut.ut_name as userTypeName, " +
                   "    numbered_u.fk_ut_idx as fkUtIdx, " +
                   "    wp.wp_name as workPlaceName, " +
                   "    numbered_u.fk_work_place_idx as workPlaceIdx, " +
                   "    numbered_u.user_is_active as userIsActive, " +
                   "    numbered_u.user_account_name as userAccountName, " +
                   "    numbered_u.user_account_number as userAccountNumber, " +
                   "    numbered_u.user_bank as userBank, " +
                   "    numbered_u.user_hourly_wage as userHourlyWage, " +
                   "    ut.ut_is_admin as isAdmin, " +
                   "    numbered_u.user_withdrawn_at as userWithdrawnAt, " +
                   "    numbered_u.nameSeq as nameSeq " +
                   "FROM ( " +
                   "    SELECT u.*, ROW_NUMBER() OVER (" +
                   "      PARTITION BY u.user_name " +
                   "      ORDER BY u.user_created_at ASC, u.user_idx ASC" +
                   "    ) as nameSeq " +
                   "    FROM user u " +
                   "    WHERE u.user_name <> '탈퇴자_비식별화' " +
                   "      AND (u.user_is_active IS NULL OR u.user_is_active <> 0) " +
                   ") numbered_u " +
                   "LEFT JOIN user_type ut ON numbered_u.fk_ut_idx = ut.ut_idx " +
                   "LEFT JOIN work_place wp ON numbered_u.fk_work_place_idx = wp.wp_idx " +
                   "WHERE (:isActive IS NULL OR numbered_u.user_is_active = :isActive) " +
                   "  AND (:wpIdx IS NULL OR numbered_u.fk_work_place_idx = :wpIdx) " +
                   "  AND (:userName IS NULL OR numbered_u.user_name LIKE CONCAT('%', :userName, '%')) " +
                   "  AND numbered_u.user_name != '탈퇴자_비식별화' " +
                   "ORDER BY numbered_u.user_name ASC, numbered_u.user_idx ASC",
           countQuery = "SELECT count(*) " +
                        "FROM user numbered_u " +
                        "WHERE (:isActive IS NULL OR numbered_u.user_is_active = :isActive) " +
                        "  AND (:wpIdx IS NULL OR numbered_u.fk_work_place_idx = :wpIdx) " +
                        "  AND (:userName IS NULL OR numbered_u.user_name LIKE CONCAT('%', :userName, '%')) " +
                        "  AND numbered_u.user_name != '탈퇴자_비식별화' " +
                        "  AND (numbered_u.user_is_active IS NULL OR numbered_u.user_is_active <> 0)",
           nativeQuery = true)
    Page<UserWithSeqProjection> searchAllEmployeesNative(
            @Param("isActive") Integer isActive,
            @Param("wpIdx") Long wpIdx,
            @Param("userName") String userName,
            Pageable pageable);

    // --- JOIN FETCH 쿼리 (N+1 방지) ---
    @Query(value = "SELECT u FROM User u JOIN FETCH u.userType JOIN FETCH u.workPlace WHERE u.userType.utIsAdmin = :isAdmin AND u.userIsActive = :isActive",
           countQuery = "SELECT COUNT(u) FROM User u WHERE u.userType.utIsAdmin = :isAdmin AND u.userIsActive = :isActive")
    Page<User> findWorkersFetch(@Param("isAdmin") Integer isAdmin, @Param("isActive") Integer isActive, Pageable pageable);

    @Query(value = "SELECT u FROM User u JOIN FETCH u.userType JOIN FETCH u.workPlace WHERE u.userType.utIsAdmin = :isAdmin AND u.userIsActive = :isActive AND u.userName LIKE %:name%",
           countQuery = "SELECT COUNT(u) FROM User u WHERE u.userType.utIsAdmin = :isAdmin AND u.userIsActive = :isActive AND u.userName LIKE %:name%")
    Page<User> findWorkersByNameFetch(@Param("isAdmin") Integer isAdmin, @Param("isActive") Integer isActive, @Param("name") String name, Pageable pageable);

    @Query(value = "SELECT u FROM User u JOIN FETCH u.userType JOIN FETCH u.workPlace WHERE u.userType.utIsAdmin = :isAdmin AND u.userIsActive = :isActive AND u.workPlace.wpIdx = :wpIdx",
           countQuery = "SELECT COUNT(u) FROM User u WHERE u.userType.utIsAdmin = :isAdmin AND u.userIsActive = :isActive AND u.workPlace.wpIdx = :wpIdx")
    Page<User> findWorkersByWorkPlaceFetch(@Param("isAdmin") Integer isAdmin, @Param("isActive") Integer isActive, @Param("wpIdx") Long wpIdx, Pageable pageable);

    @Query(value = "SELECT u FROM User u JOIN FETCH u.userType JOIN FETCH u.workPlace WHERE u.userType.utIsAdmin = :isAdmin AND u.userIsActive = :isActive AND u.workPlace.wpIdx = :wpIdx AND u.userName LIKE %:name%",
           countQuery = "SELECT COUNT(u) FROM User u WHERE u.userType.utIsAdmin = :isAdmin AND u.userIsActive = :isActive AND u.workPlace.wpIdx = :wpIdx AND u.userName LIKE %:name%")
    Page<User> findWorkersByWorkPlaceAndNameFetch(@Param("isAdmin") Integer isAdmin, @Param("isActive") Integer isActive, @Param("wpIdx") Long wpIdx, @Param("name") String name, Pageable pageable);

    @Query(value = "SELECT u FROM User u JOIN FETCH u.userType JOIN FETCH u.workPlace WHERE u.userType.utIsAdmin = :isAdmin",
           countQuery = "SELECT COUNT(u) FROM User u WHERE u.userType.utIsAdmin = :isAdmin")
    Page<User> findAllWorkersFetch(@Param("isAdmin") Integer isAdmin, Pageable pageable);

    // --- 기존 메서드 (하위 호환) ---
    Page<User> findByUserType_UtIsAdmin(Integer isAdmin, Pageable pageable);
    Page<User> findByUserType_UtIsAdminAndUserNameContaining(Integer isAdmin, String name, Pageable pageable);
    Page<User> findByUserType_UtIsAdminAndWorkPlace_WpIdx(Integer isAdmin, Long wpIdx, Pageable pageable);
    Page<User> findByUserType_UtIsAdminAndWorkPlace_WpIdxAndUserNameContaining(Integer isAdmin, Long wpIdx, String name, Pageable pageable);
    Page<User> findByUserType_UtIsAdminAndUserIsActive(Integer isAdmin, Integer isActive, Pageable pageable);
    Page<User> findByUserType_UtIsAdminAndUserIsActiveAndUserNameContaining(Integer isAdmin, Integer isActive, String name, Pageable pageable);
    Page<User> findByUserType_UtIsAdminAndUserIsActiveAndWorkPlace_WpIdx(Integer isAdmin, Integer isActive, Long wpIdx, Pageable pageable);
    Page<User> findByUserType_UtIsAdminAndUserIsActiveAndWorkPlace_WpIdxAndUserNameContaining(Integer isAdmin, Integer isActive, Long wpIdx, String name, Pageable pageable);

    @Query(value = "SELECT COUNT(*) FROM user u2 " +
            "WHERE u2.user_name = (SELECT u1.user_name FROM user u1 WHERE u1.user_idx = :userIdx) " +
            "  AND u2.user_name <> '탈퇴자_비식별화' " +
            "  AND (u2.user_is_active IS NULL OR u2.user_is_active <> 0) " +
            "  AND (" +
            "        u2.user_created_at < (SELECT u1.user_created_at FROM user u1 WHERE u1.user_idx = :userIdx) " +
            "        OR (" +
            "             u2.user_created_at <=> (SELECT u1.user_created_at FROM user u1 WHERE u1.user_idx = :userIdx) " +
            "             AND u2.user_idx <= :userIdx" +
            "           )" +
            "      )",
           nativeQuery = true)
    Long findNameSeqByUserIdx(@Param("userIdx") Long userIdx);
}
