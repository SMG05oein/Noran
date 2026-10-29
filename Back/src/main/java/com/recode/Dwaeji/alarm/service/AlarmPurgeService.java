package com.recode.Dwaeji.alarm.service;

import com.recode.Dwaeji.alarm.repository.AlarmPreferenceRepository;
import com.recode.Dwaeji.alarm.repository.AlarmSendLogRepository;
import com.recode.Dwaeji.alarm.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 퇴사·탈퇴·알람 OFF 시 구독/설정 지체 없이 파기.
 */
@Service
@RequiredArgsConstructor
public class AlarmPurgeService {

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final AlarmPreferenceRepository alarmPreferenceRepository;
    private final AlarmSendLogRepository alarmSendLogRepository;

    @Transactional
    public void purgeAllForUser(Long userIdx) {
        if (userIdx == null) {
            return;
        }
        pushSubscriptionRepository.deleteByUser_UserIdx(userIdx);
        alarmPreferenceRepository.deleteByUser_UserIdx(userIdx);
        alarmSendLogRepository.deleteByUserIdx(userIdx);
    }

    @Transactional
    public void purgeSubscriptionsOnly(Long userIdx) {
        if (userIdx == null) {
            return;
        }
        pushSubscriptionRepository.deleteByUser_UserIdx(userIdx);
    }
}
