package com.recode.Dwaeji.user.repository;

import com.recode.Dwaeji.user.database.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUserId(String userId);
    Optional<User> findByUserEmail(String userEmail);
    List<User> findByWorkPlace_WpIdx(Long wpIdx);
    
    // Pagination & Search
    org.springframework.data.domain.Page<User> findByUserType_UtIsAdmin(Integer isAdmin, org.springframework.data.domain.Pageable pageable);
    org.springframework.data.domain.Page<User> findByUserType_UtIsAdminAndUserNameContaining(Integer isAdmin, String name, org.springframework.data.domain.Pageable pageable);
    org.springframework.data.domain.Page<User> findByUserType_UtIsAdminAndWorkPlace_WpIdx(Integer isAdmin, Long wpIdx, org.springframework.data.domain.Pageable pageable);
    org.springframework.data.domain.Page<User> findByUserType_UtIsAdminAndWorkPlace_WpIdxAndUserNameContaining(Integer isAdmin, Long wpIdx, String name, org.springframework.data.domain.Pageable pageable);
}
