package com.recode.Dwaeji.alarm.scheduler;

import com.recode.Dwaeji.alarm.service.AlarmDispatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AlarmScheduler {

    private final AlarmDispatchService alarmDispatchService;

    /** Asia/Seoul 매분 0초: 누락(익일)·신청마감(금·토·일) */
    @Scheduled(cron = "0 * * * * *", zone = "Asia/Seoul")
    public void tick() {
        try {
            alarmDispatchService.dispatchMissingRecordAlarms();
        } catch (Exception e) {
            log.error("Missing-record alarm tick failed", e);
        }
        try {
            alarmDispatchService.dispatchApplyDeadlineAlarms();
        } catch (Exception e) {
            log.error("Apply-deadline alarm tick failed", e);
        }
    }
}
