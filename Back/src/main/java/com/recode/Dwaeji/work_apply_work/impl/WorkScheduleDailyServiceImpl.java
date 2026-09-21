package com.recode.Dwaeji.work_apply_work.impl;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.database.UserType;
import com.recode.Dwaeji.user.database.WorkPlace;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.user.repository.WorkPlaceRepository;
import com.recode.Dwaeji.work_apply_work.database.ApplyStatus;
import com.recode.Dwaeji.work_apply_work.database.WorkApply;
import com.recode.Dwaeji.work_apply_work.database.WorkApplyDaily;
import com.recode.Dwaeji.work_apply_work.database.WorkScheduleDaily;
import com.recode.Dwaeji.work_apply_work.dto.WorkApplyDailyRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkScheduleDailyRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkScheduleDailyResponseDto;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyDailyRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkScheduleDailyRepository;
import com.recode.Dwaeji.work_apply_work.service.WorkScheduleDailyService;
import lombok.RequiredArgsConstructor;
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

@Service
@RequiredArgsConstructor
public class WorkScheduleDailyServiceImpl implements WorkScheduleDailyService {

    private final WorkScheduleDailyRepository scheduleRepository;
    private final WorkApplyDailyRepository applyRepository;
    private final com.recode.Dwaeji.work_apply_work.repository.WorkApplyRepository workApplyRepository;
    private final UserRepository userRepository;
    private final WorkPlaceRepository workPlaceRepository;

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

    /** 확정된 실제 근무 배정만 해당. 알바생 화면/캘린더 집계에 쓴다. */
    private boolean isAssignment(ApplyStatus status) {
        return status == ApplyStatus.배정 || status == ApplyStatus.타지점근무;
    }

    /** 관리자가 주간 배정표에 남기는 행. 미배정은 '일부러 안 넣은' 결정을 기억하기 위해 저장한다. */
    private boolean isPersistedSchedule(ApplyStatus status) {
        return isAssignment(status) || status == ApplyStatus.미배정;
    }

    /** 알바생에게 공개할 배정. 임시저장(미확정)과 미배정은 숨긴다. */
    private boolean isVisibleToWorker(WorkScheduleDaily schedule) {
        return schedule != null
                && Boolean.TRUE.equals(schedule.getWsdIsConfirmed())
                && isAssignment(schedule.getWsdStatus());
    }

    @Override
    @Transactional
    public void createSchedule(String requesterId, LocalDate startDate, LocalDate endDate, Long workPlaceIdx, List<WorkScheduleDailyRequestDto> requestDtos) {
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

        // 1. 해당 기간의 기존 배정을 지점 구분 없이 조회한다.
        //    삭제 대상은 지금 편집 중인 지점의 배정으로 한정하되, 재사용 대상은 전 지점에서 찾아야
        //    같은 알바생/날짜에 지점만 다른 배정 행이 중복으로 쌓이지 않는다.
        List<WorkScheduleDaily> existingSchedules = scheduleRepository.findByWsdDateBetweenFetch(startDate, endDate);

        Set<WorkScheduleDaily> toDelete = new HashSet<>();
        for (WorkScheduleDaily s : existingSchedules) {
            if (workPlaceIdx.equals(resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser()))) {
                toDelete.add(s);
            }
        }

        Map<String, WorkScheduleDaily> existingByUserDate = new HashMap<>();
        for (WorkScheduleDaily s : existingSchedules) {
            String key = userDateKey(s.getUser().getUserIdx(), s.getWsdDate());
            WorkScheduleDaily prev = existingByUserDate.get(key);
            // 이미 중복 행이 쌓여 있다면 현재 지점 소유의 행을 우선 재사용하고 나머지는 정리되도록 둔다.
            if (prev == null || (toDelete.contains(s) && !toDelete.contains(prev))) {
                existingByUserDate.put(key, s);
            }
        }

        // 2. 배정 대상 알바생/지점을 한 번에 조회한다.
        Set<Long> targetUserIdxes = new HashSet<>();
        Set<Long> targetWpIdxes = new HashSet<>();
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

        // 3. 새로 전달받은 배정과 비교 (Smart Update)
        List<WorkScheduleDaily> toSave = new ArrayList<>();
        Set<String> requestKeySet = new HashSet<>();
        for (WorkScheduleDailyRequestDto dto : dtos) {
            if (!isPersistedSchedule(dto.getStatus())) {
                continue; // 미신청/신청은 배정 행으로 만들지 않는다.
            }
            if (dto.getDate().isBefore(startDate) || dto.getDate().isAfter(endDate)) {
                // 기간 밖의 날짜는 삭제 대상 조회에도 잡히지 않아 정리되지 않는 행이 된다.
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "배정 기간을 벗어난 날짜(" + dto.getDate() + ")가 포함되어 있습니다.");
            }

            String key = userDateKey(dto.getUserIdx(), dto.getDate());
            if (!requestKeySet.add(key)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "동일한 알바생/날짜에 중복된 배정 내역이 존재합니다.");
            }

            User targetUser = userMap.get(dto.getUserIdx());
            if (targetUser == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다.");
            }

            WorkPlace wp = dto.getWorkPlaceIdx() != null ? workPlaceMap.get(dto.getWorkPlaceIdx()) : null;
            if (wp == null) {
                wp = targetUser.getWorkPlace();
            }

            WorkScheduleDaily matched = existingByUserDate.get(key);
            boolean otherWorkplaceOwns = matched != null && !toDelete.contains(matched);
            if (otherWorkplaceOwns) {
                if (dto.getStatus() == ApplyStatus.미배정) {
                    // 다른 지점이 이미 배정한 날짜에 미배정 행을 만들면 그 배정을 덮어쓰게 된다.
                    continue;
                }
                String ownerName = matched.getWorkPlace() != null ? matched.getWorkPlace().getWpName() : "다른 지점";
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        targetUser.getDisplayName() + "님은 " + dto.getDate() + "에 이미 " + ownerName + "에 배정되어 있습니다.");
            }

            if (matched != null) {
                // 기존에 있으면 값만 UPDATE
                matched.setWsdStatus(dto.getStatus());
                matched.setWsdStartTime(dto.getStartTime());
                matched.setWorkPlace(wp);
                matched.setWsdIsConfirmed(Boolean.TRUE.equals(dto.getIsConfirmed()));
                matched.setWsdIsOpen(Boolean.TRUE.equals(dto.getIsOpen()));
                toSave.add(matched);
                toDelete.remove(matched); // 매칭된 데이터는 삭제 대상에서 제외
            } else {
                // 기존에 없으면 새로 INSERT
                WorkScheduleDaily newSchedule = WorkScheduleDaily.builder()
                        .user(targetUser)
                        .wsdDate(dto.getDate())
                        .wsdStatus(dto.getStatus())
                        .wsdStartTime(dto.getStartTime())
                        .workPlace(wp)
                        .wsdIsConfirmed(Boolean.TRUE.equals(dto.getIsConfirmed()))
                        .wsdIsOpen(Boolean.TRUE.equals(dto.getIsOpen()))
                        .build();
                toSave.add(newSchedule);
            }
        }

        // 4. 더 이상 쓰이지 않는 기존 데이터 처리 (일괄 삭제)
        if (!toDelete.isEmpty()) {
            scheduleRepository.deleteAll(toDelete);
        }

        // 5. 신규 및 수정된 데이터 일괄 저장
        if (!toSave.isEmpty()) {
            scheduleRepository.saveAll(toSave);
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
        List<com.recode.Dwaeji.work_apply_work.database.WorkApply> weeklyApplies;
        if (targetUserIdx != null) {
            weeklyApplies = workApplyRepository.findByUserIdxAndWaDateBetweenFetch(targetUserIdx, weekStart, rangeEnd);
        } else {
            weeklyApplies = workApplyRepository.findByWaDateFetch(weekStart);
        }
        Map<Long, String> weeklyRemarksMap = new HashMap<>();
        for (com.recode.Dwaeji.work_apply_work.database.WorkApply wa : weeklyApplies) {
            weeklyRemarksMap.put(wa.getUser().getUserIdx(), wa.getWaRemarks());
        }

        List<WorkScheduleDailyResponseDto> results = new ArrayList<>();
        Set<String> processedKeys = new HashSet<>();
        
        // 1. 해당 지점 소속 알바생 + 타지점이지만 이 지점에 신청/배정된 알바생 수집
        Map<Long, com.recode.Dwaeji.user.database.User> targetUserMap = new HashMap<>();
        if (workPlaceIdx != null) {
            List<com.recode.Dwaeji.user.database.User> homeUsers = userRepository.findByWorkPlace_WpIdx(workPlaceIdx);
            for (com.recode.Dwaeji.user.database.User u : homeUsers) {
                if (u.getUserIsActive() != null && (u.getUserIsActive() == 1 || u.getUserIsActive() == 2) && !isAdmin(u)) {
                    targetUserMap.put(u.getUserIdx(), u);
                }
            }
        }
        for (WorkApplyDaily a : applies) targetUserMap.put(a.getUser().getUserIdx(), a.getUser());
        for (WorkScheduleDaily s : schedules) targetUserMap.put(s.getUser().getUserIdx(), s.getUser());

        // 2. 관리자가 특정 지점을 조회하는 경우, targetUsers에 대해 기간 전체 그리드를 무조건 생성
        if (workPlaceIdx != null && targetUserIdx == null) {
            for (com.recode.Dwaeji.user.database.User u : targetUserMap.values()) {
                Long uid = u.getUserIdx();
                for (LocalDate d = rangeStart; !d.isAfter(rangeEnd); d = d.plusDays(1)) {
                    String key = uid + "_" + d.toString();
                    
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
                    String key = targetUserIdx + "_" + d.toString();
                    if (!allKeys.contains(key)) {
                        String waRemarks = weeklyRemarksMap.get(targetUserIdx);
                        results.add(WorkScheduleDailyResponseDto.builder()
                            .userIdx(targetUserIdx)
                            .userName(requester.getDisplayName())
                            .workPlaceName(requester.getWorkPlace() != null ? requester.getWorkPlace().getWpName() : null)
                            .date(d)
                            .wsdStatus(com.recode.Dwaeji.work_apply_work.database.ApplyStatus.미신청)
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

        return results.stream()
                .sorted(Comparator.comparing(WorkScheduleDailyResponseDto::getDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(WorkScheduleDailyResponseDto::getUserName, Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto> getDayAssignments(String requesterId, LocalDate date, Long workPlaceIdx) {
        User requester = getRequester(requesterId);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "조회 권한이 없습니다.");
        }
        if (date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜가 필요합니다.");
        }

        List<WorkScheduleDaily> schedules = scheduleRepository.findByWsdDateBetweenFetch(date, date);
        return schedules.stream()
                .filter(this::isVisibleToWorker)
                .filter(s -> workPlaceIdx == null || workPlaceIdx.equals(resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser())))
                .sorted(Comparator
                        .comparing(WorkScheduleDaily::getWsdStartTime, Comparator.nullsLast(String::compareTo))
                        .thenComparing(s -> s.getUser() != null ? s.getUser().getDisplayName() : null, Comparator.nullsLast(String::compareTo)))
                .map(s -> com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto.builder()
                        .userIdx(s.getUser().getUserIdx())
                        .userName(s.getUser().getDisplayName())
                        .workPlaceName(s.getWorkPlace() != null ? s.getWorkPlace().getWpName()
                                : (s.getUser().getWorkPlace() != null ? s.getUser().getWorkPlace().getWpName() : null))
                        .startTime(s.getWsdStartTime())
                        .build())
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

        List<com.recode.Dwaeji.work_apply_work.database.WorkApply> monthlyApplies = workApplyRepository.findByUserIdxAndWaDateBetweenFetch(requester.getUserIdx(), extendedStartDate, extendedEndDate);
        Map<LocalDate, String> monthlyRemarksMap = new HashMap<>();
        for (com.recode.Dwaeji.work_apply_work.database.WorkApply wa : monthlyApplies) {
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

    private List<WorkScheduleDailyResponseDto> mergeAppliesAndSchedules(List<WorkApplyDaily> applyList, List<WorkScheduleDaily> scheduleList, String waRemarks, Long defaultUserIdx, com.recode.Dwaeji.user.database.User defaultUser, LocalDate d) {
        List<WorkScheduleDailyResponseDto> res = new ArrayList<>();
        if (applyList.isEmpty() && scheduleList.isEmpty()) {
            if (defaultUserIdx != null && defaultUser != null && d != null) {
                res.add(WorkScheduleDailyResponseDto.builder()
                        .userIdx(defaultUserIdx)
                        .userName(defaultUser.getDisplayName())
                        .workPlaceName(defaultUser.getWorkPlace() != null ? defaultUser.getWorkPlace().getWpName() : null)
                        .date(d)
                        .wsdStatus(com.recode.Dwaeji.work_apply_work.database.ApplyStatus.미신청)
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
    public Map<String, Integer> getCalendarAssignmentCounts(String requesterId, int year, int month, Long workPlaceIdx) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        List<WorkScheduleDaily> schedules = scheduleRepository.findByWsdDateBetweenFetch(startDate, endDate);

        Map<String, Integer> counts = new HashMap<>();
        
        for (WorkScheduleDaily s : schedules) {
            if (!isAssignment(s.getWsdStatus())) {
                continue;
            }
            // 지점이 비어 있는 배정은 알바생의 소속 지점 기준으로 판단한다. (주간 배정표 조회와 동일)
            if (workPlaceIdx != null && !workPlaceIdx.equals(resolveWorkPlaceIdx(s.getWorkPlace(), s.getUser()))) {
                continue;
            }
            if (!Boolean.TRUE.equals(s.getWsdIsConfirmed())) {
                continue; // 임시 저장 상태의 배정은 집계하지 않는다.
            }

            LocalDate d = s.getWsdDate();
            boolean isWeekday = d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY;
            
            String t = s.getWsdStartTime();
            boolean isValidTime = true;
            if (isWeekday && t != null && !t.equals("오픈")) {
                try {
                    java.time.LocalTime lt = java.time.LocalTime.parse(t);
                    if (lt.isBefore(java.time.LocalTime.of(16, 0)) || !lt.isBefore(java.time.LocalTime.of(20, 0))) {
                        isValidTime = false;
                    }
                } catch (Exception e) {
                    isValidTime = false;
                }
            } else if (isWeekday && "오픈".equals(t)) {
                isValidTime = false;
            }

            if (isValidTime) {
                String dateStr = d.toString();
                counts.put(dateStr, counts.getOrDefault(dateStr, 0) + 1);
            }
        }
        return counts;
    }

    @Override
    @Transactional
    public void createApply(String requesterId, java.time.LocalDate startDate, java.time.LocalDate endDate, List<WorkApplyDailyRequestDto> requestDtos) {
        User requester = getRequester(requesterId);
        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "신청 기간이 올바르지 않습니다.");
        }
        
        // 1. WorkApply (주간 요약 데이터) 조회 또는 생성
        LocalDate targetMonday = startDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        WorkApply workApply = workApplyRepository.findByUser_UserIdxAndWaDate(requester.getUserIdx(), targetMonday)
                .orElseGet(() -> WorkApply.builder()
                        .user(requester)
                        .waDate(targetMonday)
                        .build());
                        

        String globalRemarks = null;

        // 프론트엔드에서 보낸 신규 데이터 파싱
        class IncomingShift {
            LocalDate date;
            Long wpIdx;
            boolean openApplied;
            String remarks;
        }
        List<IncomingShift> incomingShifts = new ArrayList<>();
        Set<String> applyKeySet = new HashSet<>(); // 중복 검사용 Set

        for (WorkApplyDailyRequestDto dto : requestDtos) {
            if (dto.getApplyDates() == null || dto.getApplyDates().isEmpty()) {
                continue;
            }
            if (globalRemarks == null && dto.getRemarks() != null && !dto.getRemarks().isBlank()) {
                globalRemarks = dto.getRemarks(); // 첫 번째 유효한 비고를 주간 비고로 사용
            }
            for (LocalDate date : dto.getApplyDates()) {
                if (date.isBefore(startDate) || date.isAfter(endDate)) {
                    // 기간 밖의 날짜는 정리 대상 조회에도 잡히지 않아 지워지지 않는 신청이 된다.
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "신청 기간을 벗어난 날짜(" + date + ")가 포함되어 있습니다.");
                }
                String key = date.toString() + "_" + dto.getWorkPlaceIdx();
                if (!applyKeySet.add(key)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "동일한 날짜(" + date + ")에 중복된 신청 내역이 존재합니다.");
                }
                IncomingShift inc = new IncomingShift();
                inc.date = date;
                inc.wpIdx = dto.getWorkPlaceIdx();
                inc.openApplied = dto.getOpenApplied() != null && dto.getOpenApplied();
                inc.remarks = dto.getRemarks();
                incomingShifts.add(inc);
            }
        }
        
        // 주간 비고 미리 저장해서 waIdx 확보 (WorkApplyDaily에 FK 걸기 위함)
        if (globalRemarks != null) {
            workApply.setWaRemarks(globalRemarks);
        }
        final WorkApply savedWorkApply = workApplyRepository.save(workApply);
        
        // 2. 기존 DB에 있는 해당 주간의 WorkApplyDaily 조회
        List<WorkApplyDaily> existingDailies =
                applyRepository.findByUserIdxAndWadDateBetweenFetch(requester.getUserIdx(), startDate, endDate);
        
        Set<WorkApplyDaily> toDelete = new HashSet<>(existingDailies);
        List<WorkApplyDaily> toSave = new ArrayList<>();
        
        // 3. Smart Update 처리 (기존 데이터가 있으면 UPDATE, 없으면 INSERT, 더 이상 없으면 DELETE)
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
                // 기존 데이터 매칭 성공 -> 값 업데이트
                matched.setWadIsOpen(inc.openApplied);
                matched.setWorkApply(savedWorkApply); // FK 연결
                toSave.add(matched);
                toDelete.remove(matched); // 매칭된 데이터는 삭제 대상에서 제외
            } else {
                // 매칭 실패 -> 새로운 데이터 추가
                WorkPlace wp = null;
                if (inc.wpIdx != null) {
                    wp = workPlaceRepository.findById(inc.wpIdx).orElse(null);
                }
                WorkApplyDaily newDaily = WorkApplyDaily.builder()
                    .user(requester)
                    .wadDate(inc.date)
                    .wadIsOpen(inc.openApplied)
                    .workPlace(wp)
                    .workApply(savedWorkApply) // FK 연결
                    .build();
                toSave.add(newDaily);
            }
        }
        
        // 삭제할 대상(더 이상 신청되지 않은 요일/지점)은 DB에서 제거
        if (!toDelete.isEmpty()) {
            // 임시 저장 상태인 배정 내역(WorkScheduleDaily) 연쇄 삭제 로직 추가
            // 그 날짜의 신청이 전부 사라진 경우에만 지운다. 여러 지점에 신청한 뒤 한 곳만
            // 취소했다면 남아 있는 신청에 대한 배정까지 지워지면 안 된다.
            Set<LocalDate> remainingDates = incomingShifts.stream()
                    .map(inc -> inc.date)
                    .collect(Collectors.toSet());
            Set<LocalDate> datesToDelete = toDelete.stream()
                    .map(WorkApplyDaily::getWadDate)
                    .filter(d -> !remainingDates.contains(d))
                    .collect(Collectors.toSet());
                    
            if (!datesToDelete.isEmpty()) {
                List<WorkScheduleDaily> existingSchedules = scheduleRepository.findByUserIdxAndWsdDateBetweenFetch(requester.getUserIdx(), startDate, endDate);
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
        
        // 추가 및 수정된 대상 저장
        if (!toSave.isEmpty()) {
            applyRepository.saveAll(toSave);
        }
    }
}
