package com.recode.Dwaeji.alarm.service;

import com.recode.Dwaeji.alarm.database.AlarmPreference;
import com.recode.Dwaeji.alarm.dto.AlarmPreferenceDto;
import com.recode.Dwaeji.alarm.repository.AlarmPreferenceRepository;
import com.recode.Dwaeji.alarm.repository.PushSubscriptionRepository;
import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class AlarmPreferenceService {

    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final AlarmPreferenceRepository alarmPreferenceRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public AlarmPreferenceDto getPreferences(String userId) {
        User user = requireUser(userId);
        AlarmPreference pref = alarmPreferenceRepository.findByUser_UserIdx(user.getUserIdx())
                .orElseGet(() -> defaultsFor(user));
        return toDto(pref);
    }

    @Transactional
    public AlarmPreferenceDto updatePreferences(String userId, AlarmPreferenceDto dto) {
        User user = requireUser(userId);
        AlarmPreference pref = alarmPreferenceRepository.findByUser_UserIdx(user.getUserIdx())
                .orElseGet(() -> AlarmPreference.builder().user(user).build());

        pref.setMissingRecordEnabled(Boolean.TRUE.equals(dto.getMissingRecordEnabled()));
        pref.setMissingRecordTime(parseTime(dto.getMissingRecordTime()));
        pref.setAssignConfirmEnabled(Boolean.TRUE.equals(dto.getAssignConfirmEnabled()));
        pref.setApplyDeadlineEnabled(Boolean.TRUE.equals(dto.getApplyDeadlineEnabled()));
        pref.setApplyDeadlineFriTime(parseTime(dto.getApplyDeadlineFriTime()));
        pref.setApplyDeadlineSatTime(parseTime(dto.getApplyDeadlineSatTime()));
        pref.setApplyDeadlineSunTime(parseTime(dto.getApplyDeadlineSunTime()));

        AlarmPreference saved = alarmPreferenceRepository.save(pref);

        // 모든 타입 OFF = 마스터 OFF → 계정 구독 전부 파기
        if (!saved.anyEnabled()) {
            pushSubscriptionRepository.deleteByUser_UserIdx(user.getUserIdx());
        }

        return toDto(saved);
    }

    private AlarmPreference defaultsFor(User user) {
        return AlarmPreference.builder()
                .user(user)
                .missingRecordEnabled(false)
                .missingRecordTime(LocalTime.of(22, 0))
                .assignConfirmEnabled(false)
                .applyDeadlineEnabled(false)
                .applyDeadlineFriTime(LocalTime.of(22, 0))
                .applyDeadlineSatTime(LocalTime.of(22, 0))
                .applyDeadlineSunTime(LocalTime.of(12, 0))
                .build();
    }

    private AlarmPreferenceDto toDto(AlarmPreference pref) {
        return AlarmPreferenceDto.builder()
                .missingRecordEnabled(Boolean.TRUE.equals(pref.getMissingRecordEnabled()))
                .missingRecordTime(formatTime(pref.getMissingRecordTime(), LocalTime.of(22, 0)))
                .assignConfirmEnabled(Boolean.TRUE.equals(pref.getAssignConfirmEnabled()))
                .applyDeadlineEnabled(Boolean.TRUE.equals(pref.getApplyDeadlineEnabled()))
                .applyDeadlineFriTime(formatTime(pref.getApplyDeadlineFriTime(), LocalTime.of(22, 0)))
                .applyDeadlineSatTime(formatTime(pref.getApplyDeadlineSatTime(), LocalTime.of(22, 0)))
                .applyDeadlineSunTime(formatTime(pref.getApplyDeadlineSunTime(), LocalTime.of(12, 0)))
                .build();
    }

    private LocalTime parseTime(String raw) {
        try {
            return LocalTime.parse(raw, HH_MM);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시각은 HH:mm 형식이어야 합니다.");
        }
    }

    private String formatTime(LocalTime time, LocalTime fallback) {
        LocalTime t = time != null ? time : fallback;
        return t.format(HH_MM);
    }

    private User requireUser(String userId) {
        return userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
    }
}
