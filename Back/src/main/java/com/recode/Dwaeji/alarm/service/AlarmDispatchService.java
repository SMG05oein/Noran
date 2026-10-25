package com.recode.Dwaeji.alarm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recode.Dwaeji.alarm.database.AlarmPreference;
import com.recode.Dwaeji.alarm.database.AlarmSendLog;
import com.recode.Dwaeji.alarm.database.AlarmType;
import com.recode.Dwaeji.alarm.database.PushSubscriptionEntity;
import com.recode.Dwaeji.alarm.repository.AlarmPreferenceRepository;
import com.recode.Dwaeji.alarm.repository.AlarmSendLogRepository;
import com.recode.Dwaeji.alarm.repository.PushSubscriptionRepository;
import com.recode.Dwaeji.work_apply_work.database.ApplyStatus;
import com.recode.Dwaeji.work_apply_work.database.WorkApply;
import com.recode.Dwaeji.work_apply_work.database.WorkScheduleDaily;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkScheduleDailyRepository;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.work_record.database.WorkRecord;
import com.recode.Dwaeji.work_record.repository.WorkRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlarmDispatchService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final AlarmPreferenceRepository alarmPreferenceRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final AlarmSendLogRepository alarmSendLogRepository;
    private final WorkScheduleDailyRepository workScheduleDailyRepository;
    private final WorkRecordRepository workRecordRepository;
    private final WorkApplyRepository workApplyRepository;
    private final UserRepository userRepository;
    private final WebPushSender webPushSender;

    /** Spring Boot 4에서 ObjectMapper 빈이 기본 노출되지 않을 수 있어 로컬 인스턴스 사용 */
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void dispatchMissingRecordAlarms() {
        if (!webPushSender.isReady()) {
            return;
        }
        LocalTime now = LocalTime.now(SEOUL).withSecond(0).withNano(0);
        LocalDate yesterday = LocalDate.now(SEOUL).minusDays(1);

        List<AlarmPreference> due = alarmPreferenceRepository.findMissingRecordDue(now);
        if (due.isEmpty()) {
            return;
        }

        List<WorkScheduleDaily> schedules = workScheduleDailyRepository
                .findByWsdDateBetweenFetch(yesterday, yesterday);

        Map<Long, List<WorkScheduleDaily>> missingByUser = new HashMap<>();
        Set<String> recordKeys = loadRecordKeys(yesterday, yesterday);

        for (WorkScheduleDaily schedule : schedules) {
            if (schedule.getWsdStatus() != ApplyStatus.출근) {
                continue;
            }
            if (!Boolean.TRUE.equals(schedule.getWsdIsConfirmed())) {
                continue;
            }
            if (schedule.getUser() == null || schedule.getUser().getUserIdx() == null) {
                continue;
            }
            Long userIdx = schedule.getUser().getUserIdx();
            Long wpIdx = schedule.getWorkPlace() != null ? schedule.getWorkPlace().getWpIdx() : null;
            String key = userIdx + "_" + schedule.getWsdDate() + "_" + (wpIdx != null ? wpIdx : "null");
            if (!recordKeys.contains(key)) {
                missingByUser.computeIfAbsent(userIdx, k -> new ArrayList<>()).add(schedule);
            }
        }

        for (AlarmPreference pref : due) {
            Long userIdx = pref.getUser().getUserIdx();
            List<WorkScheduleDaily> missing = missingByUser.get(userIdx);
            if (missing == null || missing.isEmpty()) {
                continue;
            }
            String dedupe = "MISSING_RECORD:" + yesterday.format(DATE_FMT);
            if (!tryClaim(userIdx, AlarmType.MISSING_RECORD, dedupe)) {
                continue;
            }
            String body = missing.size() == 1
                    ? yesterday.format(DATE_FMT) + " 근무 기록이 아직 없습니다."
                    : yesterday.format(DATE_FMT) + " 근무 기록 " + missing.size() + "건이 아직 없습니다.";
            send(userIdx, "근무 기록 누락 안내", body, "/records");
        }
    }

    @Transactional
    public void dispatchApplyDeadlineAlarms() {
        if (!webPushSender.isReady()) {
            return;
        }
        LocalDate today = LocalDate.now(SEOUL);
        DayOfWeek dow = today.getDayOfWeek();
        if (dow != DayOfWeek.FRIDAY && dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
            return;
        }

        LocalTime now = LocalTime.now(SEOUL).withSecond(0).withNano(0);
        int isoDow = dow.getValue(); // Fri=5 Sat=6 Sun=7
        List<AlarmPreference> due = alarmPreferenceRepository.findApplyDeadlineDue(isoDow, now);
        if (due.isEmpty()) {
            return;
        }

        // 신청 대상 주: 다가오는 월요일 (일요일이면 내일)
        LocalDate targetWeekMonday = today.with(TemporalAdjusters.next(DayOfWeek.MONDAY));
        Set<Long> appliedUserIdxes = workApplyRepository.findByWaDate(targetWeekMonday).stream()
                .map(WorkApply::getUser)
                .filter(Objects::nonNull)
                .map(u -> u.getUserIdx())
                .collect(Collectors.toSet());

        String dayLabel = switch (dow) {
            case FRIDAY -> "FRI";
            case SATURDAY -> "SAT";
            default -> "SUN";
        };
        String dedupeSuffix = today.format(DATE_FMT) + ":" + dayLabel;

        for (AlarmPreference pref : due) {
            Long userIdx = pref.getUser().getUserIdx();
            if (appliedUserIdxes.contains(userIdx)) {
                continue;
            }
            String dedupe = "APPLY_DEADLINE:" + dedupeSuffix;
            if (!tryClaim(userIdx, AlarmType.APPLY_DEADLINE, dedupe)) {
                continue;
            }
            send(userIdx,
                    "근무 신청 마감 임박",
                    "일요일 23:59까지 근무 신청을 완료해 주세요.",
                    "/requests");
        }
    }

    /**
     * 배정 CONFIRM 직후 호출. 출근+확정 대상 유저에게만 발송.
     */
    @Transactional
    public void dispatchAssignConfirmAlarms(Collection<Long> userIdxes, LocalDate weekStart, Long workPlaceIdx) {
        if (!webPushSender.isReady() || userIdxes == null || userIdxes.isEmpty()) {
            return;
        }
        List<Long> distinct = userIdxes.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            return;
        }

        List<AlarmPreference> enabled = alarmPreferenceRepository.findAssignConfirmEnabledForUsers(distinct);
        if (enabled.isEmpty()) {
            return;
        }

        String weekKey = weekStart != null ? weekStart.format(DATE_FMT) : "unknown";
        String wpKey = workPlaceIdx != null ? String.valueOf(workPlaceIdx) : "all";

        for (AlarmPreference pref : enabled) {
            Long userIdx = pref.getUser().getUserIdx();
            String dedupe = "ASSIGN_CONFIRM:" + weekKey + ":" + wpKey;
            if (!tryClaim(userIdx, AlarmType.ASSIGN_CONFIRM, dedupe)) {
                continue;
            }
            send(userIdx, "근무 배정이 확정되었습니다", "이번 주 근무 배정을 확인해 주세요.", "/calendar");
        }
    }

    private Set<String> loadRecordKeys(LocalDate start, LocalDate end) {
        List<WorkRecord> records = workRecordRepository.findByWrDateBetween(start, end);
        Set<String> keys = new HashSet<>();
        for (WorkRecord record : records) {
            if (record.getUser() == null || record.getUser().getUserIdx() == null || record.getWrDate() == null) {
                continue;
            }
            Long wpIdx = record.getWorkPlace() != null ? record.getWorkPlace().getWpIdx() : null;
            keys.add(record.getUser().getUserIdx() + "_" + record.getWrDate() + "_" + (wpIdx != null ? wpIdx : "null"));
        }
        return keys;
    }

    private boolean tryClaim(Long userIdx, AlarmType type, String dedupeKey) {
        if (alarmSendLogRepository.existsByUserIdxAndAlarmTypeAndDedupeKey(userIdx, type, dedupeKey)) {
            return false;
        }
        try {
            alarmSendLogRepository.save(AlarmSendLog.builder()
                    .userIdx(userIdx)
                    .alarmType(type)
                    .dedupeKey(dedupeKey)
                    .build());
            return true;
        } catch (Exception e) {
            // unique 충돌 = 이미 다른 트랜잭션이 발송 클레임
            log.debug("Alarm dedupe race userIdx={} type={} key={}", userIdx, type, dedupeKey);
            return false;
        }
    }

    /**
     * 개발/검증용: 로그인 본인 구독으로 테스트 푸시 1회. AlarmSendLog에 남기지 않음.
     */
    @Transactional(readOnly = true)
    public void sendTestPush(String userId) {
        if (!webPushSender.isReady()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "웹 푸시가 아직 설정되지 않았습니다.");
        }
        Long userIdx = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."))
                .getUserIdx();
        List<PushSubscriptionEntity> subs = pushSubscriptionRepository.findByUser_UserIdx(userIdx);
        if (subs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "등록된 푸시 구독이 없습니다.");
        }
        sendToSubscriptions(subs, "테스트 알람", "웹 푸시가 정상적으로 연결되었습니다.", "/mypage");
    }

    private void send(Long userIdx, String title, String body, String url) {
        List<PushSubscriptionEntity> subs = pushSubscriptionRepository.findByUser_UserIdx(userIdx);
        if (subs.isEmpty()) {
            return;
        }
        sendToSubscriptions(subs, title, body, url);
    }

    private void sendToSubscriptions(List<PushSubscriptionEntity> subs, String title, String body, String url) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("title", title);
            payload.put("body", body);
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("url", url);
            payload.put("data", data);
            String json = objectMapper.writeValueAsString(payload);
            webPushSender.sendToUserSubscriptions(subs, json);
        } catch (Exception e) {
            log.warn("Failed to build/send alarm payload: {}", e.toString());
        }
    }
}
