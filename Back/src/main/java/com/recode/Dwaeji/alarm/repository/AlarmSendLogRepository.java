package com.recode.Dwaeji.alarm.repository;

import com.recode.Dwaeji.alarm.database.AlarmSendLog;
import com.recode.Dwaeji.alarm.database.AlarmType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlarmSendLogRepository extends JpaRepository<AlarmSendLog, Long> {

    boolean existsByUserIdxAndAlarmTypeAndDedupeKey(Long userIdx, AlarmType alarmType, String dedupeKey);

    void deleteByUserIdx(Long userIdx);
}
