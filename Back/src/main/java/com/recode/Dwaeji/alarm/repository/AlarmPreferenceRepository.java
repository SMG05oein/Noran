package com.recode.Dwaeji.alarm.repository;

import com.recode.Dwaeji.alarm.database.AlarmPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface AlarmPreferenceRepository extends JpaRepository<AlarmPreference, Long> {

    Optional<AlarmPreference> findByUser_UserIdx(Long userIdx);

    void deleteByUser_UserIdx(Long userIdx);

    @Query("""
            SELECT p FROM AlarmPreference p
            JOIN FETCH p.user u
            WHERE p.missingRecordEnabled = true
              AND p.missingRecordTime = :time
              AND u.userIsActive = 1
            """)
    List<AlarmPreference> findMissingRecordDue(@Param("time") LocalTime time);

    @Query("""
            SELECT p FROM AlarmPreference p
            JOIN FETCH p.user u
            WHERE p.applyDeadlineEnabled = true
              AND u.userIsActive = 1
              AND (
                   (:dow = 5 AND p.applyDeadlineFriTime = :time)
                OR (:dow = 6 AND p.applyDeadlineSatTime = :time)
                OR (:dow = 7 AND p.applyDeadlineSunTime = :time)
              )
            """)
    List<AlarmPreference> findApplyDeadlineDue(@Param("dow") int isoDayOfWeek, @Param("time") LocalTime time);

    @Query("""
            SELECT p FROM AlarmPreference p
            JOIN FETCH p.user u
            WHERE p.assignConfirmEnabled = true
              AND u.userIdx IN :userIdxes
              AND u.userIsActive = 1
            """)
    List<AlarmPreference> findAssignConfirmEnabledForUsers(@Param("userIdxes") List<Long> userIdxes);
}
