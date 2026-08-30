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
    List<User> findByWorkPlace_WpIdx(Long wpIdx);

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
}
