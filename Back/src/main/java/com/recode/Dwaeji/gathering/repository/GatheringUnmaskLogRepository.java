package com.recode.Dwaeji.gathering.repository;

import com.recode.Dwaeji.gathering.database.GatheringUnmaskLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GatheringUnmaskLogRepository extends JpaRepository<GatheringUnmaskLog, Long> {
    List<GatheringUnmaskLog> findByTargetTypeAndTargetIdOrderByViewedAtDesc(String targetType, Long targetId);
    List<GatheringUnmaskLog> findByAdminIdOrderByViewedAtDesc(String adminId);
}
