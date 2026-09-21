package com.recode.Dwaeji.user.repository;

import com.recode.Dwaeji.user.database.ArchivedUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ArchivedUserRepository extends JpaRepository<ArchivedUser, Long> {
    List<ArchivedUser> findByDestroyDueAtBefore(LocalDateTime now);
    java.util.Optional<ArchivedUser> findByUserId(String userId);
}
