package com.recode.Dwaeji.alarm.repository;

import com.recode.Dwaeji.alarm.database.PushSubscriptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscriptionEntity, Long> {

    Optional<PushSubscriptionEntity> findByEndpoint(String endpoint);

    List<PushSubscriptionEntity> findByUser_UserIdx(Long userIdx);

    List<PushSubscriptionEntity> findByUser_UserIdxIn(List<Long> userIdxes);

    void deleteByEndpoint(String endpoint);

    void deleteByUser_UserIdx(Long userIdx);

    void deleteByUser_UserIdxAndEndpoint(Long userIdx, String endpoint);

    boolean existsByUser_UserIdx(Long userIdx);
}
