package com.recode.Dwaeji.work_apply_work.impl;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.database.UserType;
import com.recode.Dwaeji.user.database.WorkPlace;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.user.repository.WorkPlaceRepository;
import com.recode.Dwaeji.work_apply_work.OpenShiftRules;
import com.recode.Dwaeji.work_apply_work.database.*;
import com.recode.Dwaeji.work_apply_work.dto.WorkApplyDailyRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkScheduleDailyRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkScheduleDailyResponseDto;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyDailyRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkScheduleDailyRepository;
import com.recode.Dwaeji.work_apply_work.service.WorkScheduleDailyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;
import com.recode.Dwaeji.work_apply_work.database.WorkApply;
import com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyRepository;
import com.recode.Dwaeji.alarm.service.AlarmDispatchService;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkScheduleDailyServiceImpl implements WorkScheduleDailyService {

    private final WorkScheduleDailyRepository scheduleRepository;
    private final WorkApplyDailyRepository applyRepository;
    private final WorkApplyRepository workApplyRepository;
    private final UserRepository userRepository;
    private final WorkPlaceRepository workPlaceRepository;
    private final AlarmDispatchService alarmDispatchService;

    private User getRequester(String requesterId) {
        return userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "요청자를 찾을 수 없습니다."));
    }

    private boolean isAdmin(User user) {
        UserType ut = user.getUserType();
        return ut != null && (ut.getUtCanManageSchedule() != null && ut.getUtCanManageSchedule() == 1);
    }

    /**
     * 배정/신청 행이 속한 지점. 지점이 비어 있으면 알바생의 소속 지점을 따른다.
     * (조회 필터와 저장 로직이 같은 기준을 써야 중복 행이 생기지 않는다.)
     */
    private Long resolveWorkPlaceIdx(WorkPlace workPlace, User user) {
        if (workPlace != null) {
            return workPlace.getWpIdx();
        }
        return user != null && user.getWorkPlace() != null ? user.getWorkPlace().getWpIdx() : null;
    }

    private String userDateKey(Long userIdx, LocalDate date) {
        return userIdx + "_" + date;
    }

    private String userDateWpKey(Long userIdx, LocalDate date, Long workPlaceIdx) {
        return userIdx + "_" + date + "_" + (workPlaceIdx != null ? workPlaceIdx : "null");
    }

    /**
     * 실제 출근 배정. 알바생 화면/캘린더 집계에 쓴다.
     */
    private boolean isAssignment(ApplyStatus status) {
        return status == ApplyStatus.출근;
    }

    /**
     * 관리자가 주간 배정표에 남기는 행. 미출근은 '일부러 안 넣은' 결정을 기억하기 위해 저장한다.
     */
    private boolean isPersistedSchedule(ApplyStatus status) {
        return isAssignment(status) || status == ApplyStatus.미출근;
    }

    /**
     * 알바생에게 공개할 배정. 임시저장(미확정)은 숨기지만, 확정된 결과(출근, 미출근/반려)는 모두 보여준다.
     */
    private boolean isVisibleToWorker(WorkScheduleDaily schedule) {
        return schedule != null
                && Boolean.TRUE.equals(schedule.getWsdIsConfirmed());
    }

    private boolean wasConfirmedAttendance(WorkScheduleDaily existing) {
        return existing != null
                && existing.getWsdStatus() == ApplyStatus.출근
                && Boolean.TRUE.equals(existing.getWsdIsConfirmed());
    }

    /**
     * 해당 주·지점에서 이미 확정 출근이 있던 유저.
     * 확정 후 다른 요일을 새로 넣어도 "수정" 알람으로 보내기 위해 사용한다.
     */
    private Set<Long> usersWithConfirmedAttendance(
            List<WorkScheduleDaily> existingSchedules, Long workPlaceIdx) {
        Set<Long> users = new HashSet<>();
        for (WorkScheduleDaily s : existingSchedules) {
            if (!wasConfirmedAttendance(s) || s.getUser() == null) {
                continue;
            }
            if (!workPlaceIdx.equals(resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser()))) {
                continue;
            }
            users.add(s.getUser().getUserIdx());
        }
        return users;
    }

    /** CONFIRM 알람용: 신규이거나 상태/시각/확정/오픈·마감/지점이 달라지면 변경 */
    private boolean isAttendanceConfirmChanged(
            WorkScheduleDaily existing,
            ApplyStatus newStatus,
            String newStart,
            WorkPlace newWp,
            boolean newConfirmed,
            boolean newOpen,
            boolean newClose) {
        if (existing == null) {
            return true;
        }
        Long oldWp = existing.getWorkPlace() != null ? existing.getWorkPlace().getWpIdx() : null;
        Long newWpIdx = newWp != null ? newWp.getWpIdx() : null;
        return existing.getWsdStatus() != newStatus
                || !Objects.equals(normalizeTime(existing.getWsdStartTime()), normalizeTime(newStart))
                || !Objects.equals(Boolean.TRUE.equals(existing.getWsdIsConfirmed()), newConfirmed)
                || !Objects.equals(Boolean.TRUE.equals(existing.getWsdIsOpen()), newOpen)
                || !Objects.equals(Boolean.TRUE.equals(existing.getWsdIsClose()), newClose)
                || !Objects.equals(oldWp, newWpIdx);
    }

    private String normalizeTime(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String t = raw.trim();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d{2}:\\d{2})").matcher(t);
        return m.find() ? m.group(1) : t;
    }

    @Override
    @Transactional
    public AssignMode createSchedule(String requesterId, LocalDate startDate, LocalDate endDate, Long workPlaceIdx, List<WorkScheduleDailyRequestDto> requestDtos, String assignModeParam, boolean confirmedFallback) {
        AssignMode assignMode;
        try {
            assignMode = AssignMode.from(assignModeParam, confirmedFallback);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        User requester = getRequester(requesterId);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "배정 권한이 없습니다.");
        }
        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배정 기간이 올바르지 않습니다.");
        }
        if (workPlaceIdx == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배정할 지점이 지정되지 않았습니다.");
        }
        List<WorkScheduleDailyRequestDto> dtos = requestDtos != null ? requestDtos : List.of();

        // 1. 해당 기간의 기존 배정 조회.
        //    CONFIRM: 편집 지점 행을 삭제 후보로 두고 payload로 재구성.
        //    DRAFT/PARTIAL: payload 키만 upsert (다른 날·기존 공개 배정 유지, 신청→미출근 변환 없음).
        List<WorkScheduleDaily> existingSchedules = scheduleRepository.findByWsdDateBetweenFetch(startDate, endDate);

        Set<WorkScheduleDaily> toDelete = new HashSet<>();
        if (assignMode.replacesWholeRange()) {
            for (WorkScheduleDaily s : existingSchedules) {
                if (workPlaceIdx.equals(resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser()))) {
                    toDelete.add(s);
                }
            }
        }

        Map<String, WorkScheduleDaily> existingByUserDateWp = new HashMap<>();
        for (WorkScheduleDaily s : existingSchedules) {
            Long wpKey = resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser());
            String key = userDateWpKey(s.getUser().getUserIdx(), s.getWsdDate(), wpKey);
            WorkScheduleDaily prev = existingByUserDateWp.get(key);
            if (prev == null || (toDelete.contains(s) && !toDelete.contains(prev))) {
                existingByUserDateWp.put(key, s);
            }
        }

        // 2. 배정 대상 알바생/지점을 한 번에 조회한다.
        Set<Long> targetUserIdxes = new HashSet<>();
        Set<Long> targetWpIdxes = new HashSet<>();
        targetWpIdxes.add(workPlaceIdx);
        for (WorkScheduleDailyRequestDto dto : dtos) {
            if (!isPersistedSchedule(dto.getStatus())) {
                continue;
            }
            if (dto.getUserIdx() == null || dto.getDate() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배정 대상 알바생과 날짜는 필수입니다.");
            }
            targetUserIdxes.add(dto.getUserIdx());
            if (dto.getWorkPlaceIdx() != null) {
                targetWpIdxes.add(dto.getWorkPlaceIdx());
            }
        }
        Map<Long, User> userMap = userRepository.findAllById(targetUserIdxes).stream()
                .collect(Collectors.toMap(User::getUserIdx, u -> u));
        Map<Long, WorkPlace> workPlaceMap = workPlaceRepository.findAllById(targetWpIdxes).stream()
                .collect(Collectors.toMap(WorkPlace::getWpIdx, wp -> wp));

        // 3. 새로 전달받은 배정과 비교 (Smart Update). 같은 날 다른 지점은 허용.
        List<WorkScheduleDaily> toSave = new ArrayList<>();
        Set<String> requestKeySet = new HashSet<>();
        // CONFIRM 알람: 유저 단위로 최초 확정 vs 확정 후 수정 구분
        // (같은 주에 이미 확정 출근이 있으면, 다른 요일을 새로 넣어도 "수정")
        Set<Long> alreadyConfirmedUsers = usersWithConfirmedAttendance(existingSchedules, workPlaceIdx);
        Set<Long> newlyConfirmedUserIdxes = new HashSet<>();
        Set<Long> updatedAfterConfirmUserIdxes = new HashSet<>();
        for (WorkScheduleDailyRequestDto dto : dtos) {
            if (!isPersistedSchedule(dto.getStatus())) {
                continue; // 신청만 있는 경우는 배정 행으로 만들지 않는다(CONFIRM 시 미출근 upsert).
            }
            if (dto.getDate().isBefore(startDate) || dto.getDate().isAfter(endDate)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "배정 기간을 벗어난 날짜(" + dto.getDate() + ")가 포함되어 있습니다.");
            }

            User targetUser = userMap.get(dto.getUserIdx());
            if (targetUser == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다.");
            }

            WorkPlace wp = dto.getWorkPlaceIdx() != null ? workPlaceMap.get(dto.getWorkPlaceIdx()) : null;
            if (wp == null) {
                wp = targetUser.getWorkPlace();
            }
            Long resolvedWpIdx = wp != null ? wp.getWpIdx() : null;

            String key = userDateWpKey(dto.getUserIdx(), dto.getDate(), resolvedWpIdx);
            if (!requestKeySet.add(key)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "동일한 알바생/날짜/지점에 중복된 배정 내역이 존재합니다.");
            }

            WorkScheduleDaily matched = existingByUserDateWp.get(key);
            // 현재 편집 지점이 아닌 행은 건드리지 않음 (다른 지점 배정 유지)
            if (matched != null && !toDelete.contains(matched) && !workPlaceIdx.equals(resolvedWpIdx)
                    && assignMode.replacesWholeRange()) {
                continue;
            }
            if (matched != null && !workPlaceIdx.equals(resolvedWpIdx) && !assignMode.replacesWholeRange()) {
                // DRAFT/PARTIAL: 다른 지점 키는 스킵
                continue;
            }

            boolean confirmedFlag = !assignMode.forcesUnconfirmed() && Boolean.TRUE.equals(dto.getIsConfirmed());

            OpenShiftRules.NormalizedOpen openNorm =
                    OpenShiftRules.normalizeScheduleOpen(dto.getDate(), dto.getIsOpen(), dto.getStartTime());
            String resolvedStart = openNorm.startTime();
            boolean resolvedOpen = openNorm.isOpen();
            // 일반/오픈/마감은 택일. 오픈이 우선하며 마감은 출근 상태일 때만 유효.
            boolean resolvedClose = !resolvedOpen
                    && Boolean.TRUE.equals(dto.getIsClose())
                    && isAssignment(dto.getStatus());

            if (assignMode == AssignMode.CONFIRM
                    && dto.getStatus() == ApplyStatus.출근
                    && confirmedFlag
                    && isAttendanceConfirmChanged(matched, dto.getStatus(), resolvedStart, wp, confirmedFlag, resolvedOpen, resolvedClose)) {
                if (wasConfirmedAttendance(matched) || alreadyConfirmedUsers.contains(dto.getUserIdx())) {
                    updatedAfterConfirmUserIdxes.add(dto.getUserIdx());
                } else {
                    newlyConfirmedUserIdxes.add(dto.getUserIdx());
                }
            }

            if (matched != null && (toDelete.contains(matched) || !assignMode.replacesWholeRange())) {
                matched.setWsdStatus(dto.getStatus());
                matched.setWsdStartTime(resolvedStart);
                matched.setWorkPlace(wp);
                matched.setWsdIsConfirmed(confirmedFlag);
                matched.setWsdIsOpen(resolvedOpen);
                matched.setWsdIsClose(resolvedClose);
                toSave.add(matched);
                toDelete.remove(matched);
            } else if (matched == null) {
                WorkScheduleDaily newSchedule = WorkScheduleDaily.builder()
                        .user(targetUser)
                        .wsdDate(dto.getDate())
                        .wsdStatus(dto.getStatus())
                        .wsdStartTime(resolvedStart)
                        .workPlace(wp)
                        .wsdIsConfirmed(confirmedFlag)
                        .wsdIsOpen(resolvedOpen)
                        .wsdIsClose(resolvedClose)
                        .build();
                toSave.add(newSchedule);
            } else {
                matched.setWsdStatus(dto.getStatus());
                matched.setWsdStartTime(resolvedStart);
                matched.setWorkPlace(wp);
                matched.setWsdIsConfirmed(confirmedFlag);
                matched.setWsdIsOpen(resolvedOpen);
                matched.setWsdIsClose(resolvedClose);
                toSave.add(matched);
                toDelete.remove(matched);
            }
        }

        // CONFIRM: 기존 출근 확정이 이번 저장에서 삭제되면 "수정"으로 간주
        if (assignMode == AssignMode.CONFIRM) {
            for (WorkScheduleDaily deleted : toDelete) {
                if (deleted.getUser() != null && wasConfirmedAttendance(deleted)) {
                    updatedAfterConfirmUserIdxes.add(deleted.getUser().getUserIdx());
                }
            }
            // 같은 유저가 신규 확정+수정을 동시에 가지면 수정 문구 우선
            newlyConfirmedUserIdxes.removeAll(updatedAfterConfirmUserIdxes);
        }

        // 4. CONFIRM만: 더 이상 쓰이지 않는 기존 데이터 일괄 삭제
        if (!toDelete.isEmpty()) {
            scheduleRepository.deleteAll(toDelete);
        }

        // 5. 신규 및 수정된 데이터 일괄 저장
        if (!toSave.isEmpty()) {
            scheduleRepository.saveAll(toSave);
        }

        // 6. CONFIRM만: 신청만 있고 출근 없으면 미출근 행 생성
        if (assignMode.convertsUnassignedApplies()) {
            upsertUnassignedForUnassignedApplicants(startDate, endDate, workPlaceIdx, workPlaceMap.get(workPlaceIdx), toSave);
        }

        // 7. CONFIRM만: 변경된 유저에게만 웹 푸시 (최초 확정 / 확정 후 수정 문구 분리)
        if (assignMode == AssignMode.CONFIRM) {
            log.info("[alarm] CONFIRM push weekStart={} wpIdx={} newly={} updated={}",
                    startDate, workPlaceIdx, newlyConfirmedUserIdxes, updatedAfterConfirmUserIdxes);
            try {
                if (!newlyConfirmedUserIdxes.isEmpty()) {
                    alarmDispatchService.dispatchAssignConfirmAlarms(
                            newlyConfirmedUserIdxes, startDate, workPlaceIdx, false);
                }
                if (!updatedAfterConfirmUserIdxes.isEmpty()) {
                    alarmDispatchService.dispatchAssignConfirmAlarms(
                            updatedAfterConfirmUserIdxes, startDate, workPlaceIdx, true);
                }
                if (newlyConfirmedUserIdxes.isEmpty() && updatedAfterConfirmUserIdxes.isEmpty()) {
                    log.info("[alarm] CONFIRM skipped: no attendance schedule changes");
                }
            } catch (Exception e) {
                log.error("[alarm] CONFIRM push dispatch failed", e);
            }
        }

        return assignMode;
    }

    /**
     * 배정 확정 후, 신청은 있으나 출근이 없는 user+date+wp에 미출근 행을 남긴다.
     * 신청 행이 없으면(빈 칸) 건드리지 않는다.
     */
    private void upsertUnassignedForUnassignedApplicants(
            LocalDate startDate,
            LocalDate endDate,
            Long workPlaceIdx,
            WorkPlace workPlace,
            List<WorkScheduleDaily> savedSchedules) {

        Set<String> assignedKeys = new HashSet<>();
        Map<String, WorkScheduleDaily> savedByKey = new HashMap<>();
        for (WorkScheduleDaily s : savedSchedules) {
            Long wpKey = resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser());
            if (!workPlaceIdx.equals(wpKey)) {
                continue;
            }
            String key = userDateWpKey(s.getUser().getUserIdx(), s.getWsdDate(), wpKey);
            savedByKey.put(key, s);
            if (isAssignment(s.getWsdStatus())) {
                assignedKeys.add(key);
            }
        }

        // 방금 저장분 외에도 같은 기간에 남은 행(다른 지점 제외)을 다시 읽어 배정 키를 보강
        List<WorkScheduleDaily> remaining = scheduleRepository.findByWsdDateBetweenFetch(startDate, endDate);
        for (WorkScheduleDaily s : remaining) {
            Long wpKey = resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser());
            if (!workPlaceIdx.equals(wpKey)) {
                continue;
            }
            String key = userDateWpKey(s.getUser().getUserIdx(), s.getWsdDate(), wpKey);
            savedByKey.putIfAbsent(key, s);
            if (isAssignment(s.getWsdStatus())) {
                assignedKeys.add(key);
            }
        }

        List<WorkApplyDaily> applies = applyRepository.findByWadDateBetweenFetch(startDate, endDate).stream()
                .filter(a -> workPlaceIdx.equals(resolveWorkPlaceIdx(a.getWorkPlace(), a.getUser())))
                .collect(Collectors.toList());

        WorkPlace resolvedWp = workPlace;
        if (resolvedWp == null) {
            resolvedWp = workPlaceRepository.findById(workPlaceIdx).orElse(null);
        }

        List<WorkScheduleDaily> unassignedToSave = new ArrayList<>();
        Set<String> unassignedKeys = new HashSet<>();
        for (WorkApplyDaily apply : applies) {
            Long uid = apply.getUser().getUserIdx();
            LocalDate date = apply.getWadDate();
            Long wpKey = resolveWorkPlaceIdx(apply.getWorkPlace(), apply.getUser());
            String key = userDateWpKey(uid, date, wpKey);
            if (assignedKeys.contains(key) || !unassignedKeys.add(key)) {
                continue;
            }

            WorkScheduleDaily existing = savedByKey.get(key);
            if (existing != null) {
                if (isAssignment(existing.getWsdStatus())) {
                    continue;
                }
                existing.setWsdStatus(ApplyStatus.미출근);
                existing.setWsdStartTime(null);
                existing.setWsdIsConfirmed(true);
                existing.setWsdIsOpen(false);
                existing.setWsdIsClose(false);
                if (existing.getWorkPlace() == null && resolvedWp != null) {
                    existing.setWorkPlace(resolvedWp);
                }
                unassignedToSave.add(existing);
            } else {
                WorkPlace wpForRow = apply.getWorkPlace() != null ? apply.getWorkPlace() : resolvedWp;
                unassignedToSave.add(WorkScheduleDaily.builder()
                        .user(apply.getUser())
                        .wsdDate(date)
                        .wsdStatus(ApplyStatus.미출근)
                        .wsdStartTime(null)
                        .workPlace(wpForRow)
                        .wsdIsConfirmed(true)
                        .wsdIsOpen(false)
                        .build());
            }
        }

        if (!unassignedToSave.isEmpty()) {
            scheduleRepository.saveAll(unassignedToSave);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkScheduleDailyResponseDto> getDailySchedules(String requesterId, Long workPlaceIdx, LocalDate startDate, LocalDate endDate) {
        User requester = getRequester(requesterId);
        Long targetUserIdx = isAdmin(requester) ? null : requester.getUserIdx();

        // 기간이 비어 있으면 이번 주(월~일)로 본다. 컨트롤러에서 모두 선택 파라미터라 null로 들어올 수 있다.
        final LocalDate rangeStart = startDate != null
                ? startDate
                : LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        final LocalDate rangeEnd = endDate != null ? endDate : rangeStart.plusDays(6);
        if (rangeStart.isAfter(rangeEnd)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회 기간이 올바르지 않습니다.");
        }

        List<WorkApplyDaily> applies;
        List<WorkScheduleDaily> schedules;

        if (targetUserIdx != null) {
            applies = applyRepository.findByUserIdxAndWadDateBetweenFetch(targetUserIdx, rangeStart, rangeEnd);
            schedules = scheduleRepository.findByUserIdxAndWsdDateBetweenFetch(targetUserIdx, rangeStart, rangeEnd)
                    .stream()
                    .filter(this::isVisibleToWorker)
                    .collect(Collectors.toList());
        } else {
            applies = applyRepository.findByWadDateBetweenFetch(rangeStart, rangeEnd);
            schedules = scheduleRepository.findByWsdDateBetweenFetch(rangeStart, rangeEnd);

            if (workPlaceIdx != null) {
                // 특정 지점 조회일 경우, 해당 지점에 신청/배정된 데이터만 남김
                // 단, DB에 지점이 null로 저장된 경우(본인 소속 지점 신청) 유저의 소속 지점이 해당 지점인지 확인
                applies = applies.stream()
                        .filter(a -> workPlaceIdx.equals(resolveWorkPlaceIdx(a.getWorkPlace(), a.getUser())))
                        .collect(Collectors.toList());
                schedules = schedules.stream()
                        .filter(s -> workPlaceIdx.equals(resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser())))
                        .collect(Collectors.toList());
            }
        }

        // 유저_날짜별 매핑
        Map<String, List<WorkApplyDaily>> applyMap = applies.stream()
                .collect(Collectors.groupingBy(a -> a.getUser().getUserIdx() + "_" + a.getWadDate().toString()));

        Map<String, List<WorkScheduleDaily>> scheduleMap = schedules.stream()
                .collect(Collectors.groupingBy(s -> s.getUser().getUserIdx() + "_" + s.getWsdDate().toString()));

        // 주간 비고 가져오기 (WorkApply는 주의 월요일 기준으로 저장된다)
        LocalDate weekStart = rangeStart.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<WorkApply> weeklyApplies;
        if (targetUserIdx != null) {
            weeklyApplies = workApplyRepository.findByUserIdxAndWaDateBetweenFetch(targetUserIdx, weekStart, rangeEnd);
        } else {
            weeklyApplies = workApplyRepository.findByWaDateFetch(weekStart);
        }
        Map<Long, String> weeklyRemarksMap = new HashMap<>();
        for (WorkApply wa : weeklyApplies) {
            weeklyRemarksMap.put(wa.getUser().getUserIdx(), wa.getWaRemarks());
        }

        List<WorkScheduleDailyResponseDto> results = new ArrayList<>();
        Set<String> processedKeys = new HashSet<>();

        // 1. 해당 지점 소속 알바생 + 타지점 소속이지만 이 지점에 신청/배정된 알바생 수집
        Map<Long, User> targetUserMap = new HashMap<>();
        if (workPlaceIdx != null) {
            List<User> homeUsers = userRepository.findByWorkPlace_WpIdx(workPlaceIdx);
            for (User u : homeUsers) {
                if (u.getUserIsActive() != null && (u.getUserIsActive() == 1 || u.getUserIsActive() == 2) && !isAdmin(u)) {
                    targetUserMap.put(u.getUserIdx(), u);
                }
            }
        }
        for (WorkApplyDaily a : applies) targetUserMap.put(a.getUser().getUserIdx(), a.getUser());
        for (WorkScheduleDaily s : schedules) targetUserMap.put(s.getUser().getUserIdx(), s.getUser());

        // 2. 관리자가 특정 지점을 조회하는 경우, targetUsers에 대해 기간 전체 그리드를 무조건 생성
        if (workPlaceIdx != null && targetUserIdx == null) {
            for (User u : targetUserMap.values()) {
                Long uid = u.getUserIdx();
                for (LocalDate d = rangeStart; !d.isAfter(rangeEnd); d = d.plusDays(1)) {
                    String key = uid + "_" + d;

                    List<WorkApplyDaily> applyList = applyMap.getOrDefault(key, new ArrayList<>());
                    List<WorkScheduleDaily> scheduleList = scheduleMap.getOrDefault(key, new ArrayList<>());

                    // 안전한 병합 로직 (지점 기준)
                    String waRemarks = weeklyRemarksMap.get(uid);
                    results.addAll(mergeAppliesAndSchedules(applyList, scheduleList, waRemarks, uid, u, d));
                    processedKeys.add(key);
                }
            }
        } else {
            // 개인 조회이거나 지점 조건이 없는 경우, 있는 데이터만 반환 (또는 개인이면 개인의 기간 전체)
            Set<String> allKeys = new HashSet<>();
            allKeys.addAll(applyMap.keySet());
            allKeys.addAll(scheduleMap.keySet());

            // 만약 알바생 본인 조회라면 본인의 기간 전체 껍데기를 만들어야 함
            if (targetUserIdx != null) {
                for (LocalDate d = rangeStart; !d.isAfter(rangeEnd); d = d.plusDays(1)) {
                    String key = targetUserIdx + "_" + d;
                    if (!allKeys.contains(key)) {
                        String waRemarks = weeklyRemarksMap.get(targetUserIdx);
                        results.add(WorkScheduleDailyResponseDto.builder()
                                .userIdx(targetUserIdx)
                                .userName(requester.getUserName())
                                .workPlaceName(requester.getWorkPlace() != null ? requester.getWorkPlace().getWpName() : null)
                                .date(d)
                                .wsdStatus(null)
                                .wsdIsConfirmed(false)
                                .openApplied(false)
                                .wsdRemarks(waRemarks)
                                .build());
                    }
                }
            }

            for (String key : allKeys) {
                if (processedKeys.contains(key)) continue;
                List<WorkApplyDaily> applyList = applyMap.getOrDefault(key, new ArrayList<>());
                List<WorkScheduleDaily> scheduleList = scheduleMap.getOrDefault(key, new ArrayList<>());

                // 안전한 병합 로직 (지점 기준)
                Long uIdx = null;
                if (!applyList.isEmpty()) uIdx = applyList.get(0).getUser().getUserIdx();
                else if (!scheduleList.isEmpty()) uIdx = scheduleList.get(0).getUser().getUserIdx();

                String waRemarks = uIdx != null ? weeklyRemarksMap.get(uIdx) : null;
                results.addAll(mergeAppliesAndSchedules(applyList, scheduleList, waRemarks, null, null, null));
            }
        }

        Map<Long, Long> nameSeqCache = new HashMap<>();
        for (WorkScheduleDailyResponseDto dto : results) {
            if (dto.getUserIdx() == null) continue;
            Long seq = nameSeqCache.computeIfAbsent(dto.getUserIdx(), id -> {
                Long s = userRepository.findNameSeqByUserIdx(id);
                return s != null ? s : 1L;
            });
            dto.setNameSeq(seq);
        }

        return results.stream()
                .sorted(Comparator.comparing(WorkScheduleDailyResponseDto::getDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(WorkScheduleDailyResponseDto::getUserName, Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DailyScheduleDto> getDayAssignments(String requesterId, LocalDate date, Long workPlaceIdx) {
        User requester = getRequester(requesterId);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "조회 권한이 없습니다.");
        }
        if (date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜가 필요합니다.");
        }

        List<WorkScheduleDaily> schedules = scheduleRepository.findByWsdDateBetweenFetch(date, date);
        return schedules.stream()
                // 관리자 대시보드: 임시 저장(미확정) 배정도 포함. 알바생 공개는 isVisibleToWorker 유지.
                .filter(s -> s != null && isAssignment(s.getWsdStatus()))
                .filter(s -> workPlaceIdx == null || workPlaceIdx.equals(resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser())))
                .sorted(Comparator
                        .comparing(WorkScheduleDaily::getWsdStartTime, Comparator.nullsLast(String::compareTo))
                        .thenComparing(s -> s.getUser() != null ? s.getUser().getUserName() : null, Comparator.nullsLast(String::compareTo)))
                .map(s -> {
                    Long seq = userRepository.findNameSeqByUserIdx(s.getUser().getUserIdx());
                    return DailyScheduleDto.builder()
                            .userIdx(s.getUser().getUserIdx())
                            .userName(s.getUser().getUserName())
                            .nameSeq(seq != null ? seq : 1L)
                            .workPlaceName(s.getWorkPlace() != null ? s.getWorkPlace().getWpName()
                                    : (s.getUser().getWorkPlace() != null ? s.getUser().getWorkPlace().getWpName() : null))
                            .startTime(s.getWsdStartTime())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkScheduleDailyResponseDto> getMonthlySchedules(String requesterId, int year, int month) {
        User requester = getRequester(requesterId);
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();
        // 달력·주간(월~일) UI에 맞춰, 그달이 걸친 주의 월요일~일요일까지 조회한다.
        LocalDate extendedStartDate = startDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate extendedEndDate = endDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        List<WorkApplyDaily> applies = applyRepository.findByUserIdxAndWadDateBetweenFetch(requester.getUserIdx(), extendedStartDate, extendedEndDate);
        List<WorkScheduleDaily> schedules = scheduleRepository.findByUserIdxAndWsdDateBetweenFetch(requester.getUserIdx(), extendedStartDate, extendedEndDate)
                .stream()
                .filter(this::isVisibleToWorker)
                .collect(Collectors.toList());

        // Group by Date
        Map<LocalDate, List<WorkApplyDaily>> applyMap = applies.stream().collect(Collectors.groupingBy(WorkApplyDaily::getWadDate));
        Map<LocalDate, List<WorkScheduleDaily>> scheduleMap = schedules.stream().collect(Collectors.groupingBy(WorkScheduleDaily::getWsdDate));

        Set<LocalDate> allDates = new TreeSet<>(Comparator.naturalOrder());
        allDates.addAll(applyMap.keySet());
        allDates.addAll(scheduleMap.keySet());

        List<WorkApply> monthlyApplies = workApplyRepository.findByUserIdxAndWaDateBetweenFetch(requester.getUserIdx(), extendedStartDate, extendedEndDate);
        Map<LocalDate, String> monthlyRemarksMap = new HashMap<>();
        for (WorkApply wa : monthlyApplies) {
            monthlyRemarksMap.put(wa.getWaDate(), wa.getWaRemarks());
        }

        List<WorkScheduleDailyResponseDto> results = new ArrayList<>();
        for (LocalDate date : allDates) {
            List<WorkApplyDaily> applyList = applyMap.getOrDefault(date, List.of());
            List<WorkScheduleDaily> scheduleList = scheduleMap.getOrDefault(date, List.of());

            // 안전한 병합 로직 (지점 기준)
            String waRemarks = null;
            LocalDate monday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            waRemarks = monthlyRemarksMap.get(monday);
            results.addAll(mergeAppliesAndSchedules(applyList, scheduleList, waRemarks, null, null, null));
        }
        return results;
    }

    private List<WorkScheduleDailyResponseDto> mergeAppliesAndSchedules(List<WorkApplyDaily> applyList, List<WorkScheduleDaily> scheduleList, String waRemarks, Long defaultUserIdx, User defaultUser, LocalDate d) {
        List<WorkScheduleDailyResponseDto> res = new ArrayList<>();
        if (applyList.isEmpty() && scheduleList.isEmpty()) {
            if (defaultUserIdx != null && defaultUser != null && d != null) {
                res.add(WorkScheduleDailyResponseDto.builder()
                        .userIdx(defaultUserIdx)
                        .userName(defaultUser.getUserName())
                        .workPlaceName(defaultUser.getWorkPlace() != null ? defaultUser.getWorkPlace().getWpName() : null)
                        .date(d)
                        .wsdStatus(null)
                        .wsdIsConfirmed(false)
                        .openApplied(false)
                        .wsdRemarks(waRemarks)
                        .build());
            }
            return res;
        }

        Map<Long, WorkApplyDaily> aByWp = new HashMap<>();
        for (WorkApplyDaily a : applyList) {
            Long wp = resolveWorkPlaceIdx(a.getWorkPlace(), a.getUser());
            aByWp.put(wp != null ? wp : -1L, a);
        }
        Map<Long, WorkScheduleDaily> sByWp = new HashMap<>();
        for (WorkScheduleDaily s : scheduleList) {
            Long wp = resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser());
            sByWp.put(wp != null ? wp : -1L, s);
        }

        Set<Long> allWps = new HashSet<>();
        allWps.addAll(aByWp.keySet());
        allWps.addAll(sByWp.keySet());

        for (Long wp : allWps) {
            WorkApplyDaily a = aByWp.get(wp);
            WorkScheduleDaily s = sByWp.get(wp);
            res.add(WorkScheduleDailyResponseDto.fromEntityAndApply(s, a, waRemarks));
        }
        return res;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Map<String, Integer>> getCalendarAssignmentCounts(String requesterId, LocalDate startDate, LocalDate endDate, Long workPlaceIdx) {

        List<WorkScheduleDaily> schedules = scheduleRepository.findByWsdDateBetweenFetch(startDate, endDate);
        Map<String, Map<String, Integer>> counts = new HashMap<>();

        for (WorkScheduleDaily s : schedules) {
            if (!isAssignment(s.getWsdStatus())) {
                continue;
            }
            if (workPlaceIdx != null && !workPlaceIdx.equals(resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser()))) {
                continue;
            }
            // 관리자 캘린더: 임시 저장(미확정) 포함. 알바생 월간 조회는 isVisibleToWorker 유지.

            String dateStr = s.getWsdDate().toString();
            Map<String, Integer> day = counts.computeIfAbsent(dateStr, k -> {
                Map<String, Integer> m = new HashMap<>();
                m.put("total", 0);
                m.put("peak", 0);
                return m;
            });
            day.put("total", day.get("total") + 1);
            if (isPeakAssignment(s)) {
                day.put("peak", day.get("peak") + 1);
            }
        }
        return counts;
    }

    /**
     * 피크: 16:00 <= t < 20:00 (요일 무관). 오픈조 제외.
     * 마감조는 시각이 피크 구간 안이면 포함(피크+마감 겸임), 구간 밖(20시 이후)이면 자연히 제외.
     */
    private boolean isPeakAssignment(WorkScheduleDaily s) {
        if (Boolean.TRUE.equals(s.getWsdIsOpen())) {
            return false;
        }
        String t = s.getWsdStartTime();
        if (t == null || t.isBlank()) {
            return false;
        }
        if ("오픈".equals(t.trim())) {
            return false;
        }
        try {
            java.time.LocalTime lt = java.time.LocalTime.parse(t.trim());
            return !lt.isBefore(java.time.LocalTime.of(16, 0)) && lt.isBefore(java.time.LocalTime.of(20, 0));
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    @Transactional
    public void createApply(String requesterId, java.time.LocalDate startDate, java.time.LocalDate endDate, List<WorkApplyDailyRequestDto> requestDtos) {
        User requester = getRequester(requesterId);
        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "신청 기간이 올바르지 않습니다.");
        }
        List<WorkApplyDaily> existingDailies =
                applyRepository.findByUserIdxAndWadDateBetweenFetch(requester.getUserIdx(), startDate, endDate);
        if (!existingDailies.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 신청한 주입니다");
        }
        saveApplyShifts(requester, startDate, endDate, requestDtos, false);
    }

    @Override
    @Transactional
    public void updateApply(String requesterId, java.time.LocalDate startDate, java.time.LocalDate endDate, List<WorkApplyDailyRequestDto> requestDtos) {
        User requester = getRequester(requesterId);
        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "신청 기간이 올바르지 않습니다.");
        }
        List<WorkApplyDaily> existingDailies =
                applyRepository.findByUserIdxAndWadDateBetweenFetch(requester.getUserIdx(), startDate, endDate);
        if (existingDailies.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 신청 내역이 없습니다");
        }
        saveApplyShifts(requester, startDate, endDate, requestDtos, true);
    }

    private void saveApplyShifts(User requester, LocalDate startDate, LocalDate endDate,
                                 List<WorkApplyDailyRequestDto> requestDtos, boolean allowSmartUpdate) {
        LocalDate targetMonday = startDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        WorkApply workApply = workApplyRepository.findByUser_UserIdxAndWaDate(requester.getUserIdx(), targetMonday)
                .orElseGet(() -> WorkApply.builder()
                        .user(requester)
                        .waDate(targetMonday)
                        .build());

        String globalRemarks = null;
        class IncomingShift {
            LocalDate date;
            Long wpIdx;
            boolean openApplied;
        }
        List<IncomingShift> incomingShifts = new ArrayList<>();
        Set<String> applyKeySet = new HashSet<>();
        List<WorkApplyDailyRequestDto> dtos = requestDtos != null ? requestDtos : List.of();

        for (WorkApplyDailyRequestDto dto : dtos) {
            if (dto.getApplyDates() == null || dto.getApplyDates().isEmpty()) {
                continue;
            }
            if (globalRemarks == null && dto.getRemarks() != null && !dto.getRemarks().isBlank()) {
                globalRemarks = dto.getRemarks();
            }
            for (LocalDate date : dto.getApplyDates()) {
                if (date.isBefore(startDate) || date.isAfter(endDate)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "신청 기간을 벗어난 날짜(" + date + ")가 포함되어 있습니다.");
                }
                // 오픈 신청: 날짜별 공식 오픈 시각만 허용(평일 16:00 / 주말·공휴 10:00).
                // apply DTO에 시각 필드는 없으나, 오픈 플래그 남용 방지용으로 규칙 존재 여부를 서버에서 확정.
                if (dto.getOpenApplied() != null && dto.getOpenApplied()) {
                    OpenShiftRules.expectedOpenStart(date);
                }
                String key = date + "_" + dto.getWorkPlaceIdx();
                if (!applyKeySet.add(key)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "동일한 날짜(" + date + ")·지점에 중복된 신청 내역이 존재합니다.");
                }
                IncomingShift inc = new IncomingShift();
                inc.date = date;
                inc.wpIdx = dto.getWorkPlaceIdx();
                inc.openApplied = dto.getOpenApplied() != null && dto.getOpenApplied();
                incomingShifts.add(inc);
            }
        }
        if (incomingShifts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "신청할 날짜가 없습니다.");
        }
        if (globalRemarks != null) {
            workApply.setWaRemarks(globalRemarks);
        }
        final WorkApply savedWorkApply = workApplyRepository.save(workApply);

        if (!allowSmartUpdate) {
            List<WorkApplyDaily> toInsert = new ArrayList<>();
            for (IncomingShift inc : incomingShifts) {
                WorkPlace wp = inc.wpIdx != null ? workPlaceRepository.findById(inc.wpIdx).orElse(null) : null;
                toInsert.add(WorkApplyDaily.builder()
                        .user(requester)
                        .wadDate(inc.date)
                        .wadIsOpen(inc.openApplied)
                        .workPlace(wp)
                        .workApply(savedWorkApply)
                        .build());
            }
            applyRepository.saveAll(toInsert);
            return;
        }

        List<WorkApplyDaily> existingDailies =
                applyRepository.findByUserIdxAndWadDateBetweenFetch(requester.getUserIdx(), startDate, endDate);
        Set<WorkApplyDaily> toDelete = new HashSet<>(existingDailies);
        List<WorkApplyDaily> toSave = new ArrayList<>();

        for (IncomingShift inc : incomingShifts) {
            WorkApplyDaily matched = null;
            for (WorkApplyDaily ex : toDelete) {
                if (ex.getWadDate().equals(inc.date) &&
                        ((ex.getWorkPlace() == null && inc.wpIdx == null) ||
                                (ex.getWorkPlace() != null && ex.getWorkPlace().getWpIdx().equals(inc.wpIdx)))) {
                    matched = ex;
                    break;
                }
            }
            if (matched != null) {
                matched.setWadIsOpen(inc.openApplied);
                matched.setWorkApply(savedWorkApply);
                toSave.add(matched);
                toDelete.remove(matched);
            } else {
                WorkPlace wp = inc.wpIdx != null ? workPlaceRepository.findById(inc.wpIdx).orElse(null) : null;
                toSave.add(WorkApplyDaily.builder()
                        .user(requester)
                        .wadDate(inc.date)
                        .wadIsOpen(inc.openApplied)
                        .workPlace(wp)
                        .workApply(savedWorkApply)
                        .build());
            }
        }

        if (!toDelete.isEmpty()) {
            Set<LocalDate> remainingDates = incomingShifts.stream().map(inc -> inc.date).collect(Collectors.toSet());
            Set<LocalDate> datesToDelete = toDelete.stream()
                    .map(WorkApplyDaily::getWadDate)
                    .filter(d -> !remainingDates.contains(d))
                    .collect(Collectors.toSet());
            if (!datesToDelete.isEmpty()) {
                List<WorkScheduleDaily> existingSchedules =
                        scheduleRepository.findByUserIdxAndWsdDateBetweenFetch(requester.getUserIdx(), startDate, endDate);
                List<WorkScheduleDaily> schedulesToDelete = new ArrayList<>();
                for (WorkScheduleDaily s : existingSchedules) {
                    if (datesToDelete.contains(s.getWsdDate()) && !Boolean.TRUE.equals(s.getWsdIsConfirmed())) {
                        schedulesToDelete.add(s);
                    }
                }
                if (!schedulesToDelete.isEmpty()) {
                    scheduleRepository.deleteAll(schedulesToDelete);
                }
            }
            applyRepository.deleteAll(toDelete);
        }
        if (!toSave.isEmpty()) {
            applyRepository.saveAll(toSave);
        }
    }
}
