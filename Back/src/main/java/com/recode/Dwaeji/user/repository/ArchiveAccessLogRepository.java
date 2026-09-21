package com.recode.Dwaeji.user.repository;

import com.recode.Dwaeji.user.database.ArchiveAccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ArchiveAccessLogRepository extends JpaRepository<ArchiveAccessLog, Long> {
}
