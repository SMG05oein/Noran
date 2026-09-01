package com.recode.Dwaeji.work_apply_work.impl;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.database.WorkPlace;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.user.repository.WorkPlaceRepository;
import com.recode.Dwaeji.work_apply_work.database.ApplyStatus;
import com.recode.Dwaeji.work_apply_work.database.WorkApplyWork;
import com.recode.Dwaeji.work_apply_work.dto.WorkApplyWorkRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkApplyWorkResponseDto;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyWorkRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyRepository;
import com.recode.Dwaeji.work_apply_work.database.WorkApply;
import com.recode.Dwaeji.work_apply_work.service.WorkApplyWorkService;
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
public class WorkApplyWorkServiceImpl implements WorkApplyWorkService {

    private final WorkApplyWorkRepository workApplyWorkRepository;
    private final WorkApplyRepository workApplyRepository;
    private final UserRepository userRepository;
    private final WorkPlaceRepository workPlaceRepository;

    private User getRequester(String requesterId) {
        return userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
    }

    private boolean isAdmin(User user) {
        return user.getUserType() != null && user.getUserType().getUtIsAdmin() != null && user.getUserType().getUtIsAdmin() == 1;
    }

    private void checkDeadline(LocalDate wawDate, User requester) {
        if (isAdmin(requester)) return;
        
        // 프론트에서 어떤 요일을 보내든 강제로 해당 주의 '월요일'을 기준으로 마감일 계산
        LocalDate monday = wawDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        java.time.LocalDateTime deadline = monday.minusDays(1).atStartOfDay(); // 일요일 00:00:00
        
        if (java.time.LocalDateTime.now().isAfter(deadline)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 주차의 근무 신청/수정 마감 기한(일요일 00:00)이 지났습니다.");
        }
    }

    private boolean isAllUnapplied(WorkApplyWork apply) {
        if (apply.getWawIsConfirmed() != null && apply.getWawIsConfirmed()) return false;
        return (apply.getWawIsMon() == ApplyStatus.미신청 || apply.getWawIsMon() == ApplyStatus.미배정) &&
               (apply.getWawIsTue() == ApplyStatus.미신청 || apply.getWawIsTue() == ApplyStatus.미배정) &&
               (apply.getWawIsWed() == ApplyStatus.미신청 || apply.getWawIsWed() == ApplyStatus.미배정) &&
               (apply.getWawIsThu() == ApplyStatus.미신청 || apply.getWawIsThu() == ApplyStatus.미배정) &&
               (apply.getWawIsFri() == ApplyStatus.미신청 || apply.getWawIsFri() == ApplyStatus.미배정) &&
               (apply.getWawIsSat() == ApplyStatus.미신청 || apply.getWawIsSat() == ApplyStatus.미배정) &&
               (apply.getWawIsSun() == ApplyStatus.미신청 || apply.getWawIsSun() == ApplyStatus.미배정);
    }

    private boolean isAllUnapplied(WorkApplyWorkRequestDto dto) {
        if (dto.getWawIsConfirmed() != null && dto.getWawIsConfirmed()) return false;
        return (dto.getWawIsMon() == null || dto.getWawIsMon() == ApplyStatus.미신청 || dto.getWawIsMon() == ApplyStatus.미배정) &&
               (dto.getWawIsTue() == null || dto.getWawIsTue() == ApplyStatus.미신청 || dto.getWawIsTue() == ApplyStatus.미배정) &&
               (dto.getWawIsWed() == null || dto.getWawIsWed() == ApplyStatus.미신청 || dto.getWawIsWed() == ApplyStatus.미배정) &&
               (dto.getWawIsThu() == null || dto.getWawIsThu() == ApplyStatus.미신청 || dto.getWawIsThu() == ApplyStatus.미배정) &&
               (dto.getWawIsFri() == null || dto.getWawIsFri() == ApplyStatus.미신청 || dto.getWawIsFri() == ApplyStatus.미배정) &&
               (dto.getWawIsSat() == null || dto.getWawIsSat() == ApplyStatus.미신청 || dto.getWawIsSat() == ApplyStatus.미배정) &&
               (dto.getWawIsSun() == null || dto.getWawIsSun() == ApplyStatus.미신청 || dto.getWawIsSun() == ApplyStatus.미배정);
    }

    private WorkPlace resolveWorkPlace(Long wpIdx, WorkPlace defaultWp) {
        if (wpIdx != null) {
            return workPlaceRepository.findById(wpIdx).orElse(defaultWp);
        }
        return defaultWp;
    }

    private WorkPlace getDayWorkPlace(WorkApplyWork apply, DayOfWeek dayOfWeek) {
        WorkPlace wp = null;
        switch (dayOfWeek) {
            case MONDAY:    wp = apply.getWawMonWorkPlace(); break;
            case TUESDAY:   wp = apply.getWawTueWorkPlace(); break;
            case WEDNESDAY: wp = apply.getWawWedWorkPlace(); break;
            case THURSDAY:  wp = apply.getWawThuWorkPlace(); break;
            case FRIDAY:    wp = apply.getWawFriWorkPlace(); break;
            case SATURDAY:  wp = apply.getWawSatWorkPlace(); break;
            case SUNDAY:    wp = apply.getWawSunWorkPlace(); break;
        }
        return wp != null ? wp : (apply.getUser() != null ? apply.getUser().getWorkPlace() : null);
    }

    private ApplyStatus getDayStatus(WorkApplyWork apply, DayOfWeek dayOfWeek) {
        switch (dayOfWeek) {
            case MONDAY:    return apply.getWawIsMon();
            case TUESDAY:   return apply.getWawIsTue();
            case WEDNESDAY: return apply.getWawIsWed();
            case THURSDAY:  return apply.getWawIsThu();
            case FRIDAY:    return apply.getWawIsFri();
            case SATURDAY:  return apply.getWawIsSat();
            case SUNDAY:    return apply.getWawIsSun();
            default:        return null;
        }
    }

    private boolean isAssignedToWorkPlace(WorkApplyWork apply, Long workPlaceIdx) {
        if (workPlaceIdx == null) return false;
        for (DayOfWeek day : DayOfWeek.values()) {
            ApplyStatus status = getDayStatus(apply, day);
            if (status == ApplyStatus.배정) {
                WorkPlace wp = getDayWorkPlace(apply, day);
                if (wp != null && workPlaceIdx.equals(wp.getWpIdx())) {
                    return true;
                }
            }
        }
        return false;
    }

    private WorkApplyWorkResponseDto mapToDtoForWorkPlace(WorkApplyWork apply, Long targetWorkPlaceIdx) {
        WorkApplyWorkResponseDto dto = mapToDto(apply);
        if (targetWorkPlaceIdx == null) {
            return dto;
        }
        if (dto.getWawIsMon() == ApplyStatus.배정 && dto.getWawMonWorkPlaceIdx() != null && !dto.getWawMonWorkPlaceIdx().equals(targetWorkPlaceIdx)) {
            dto.setWawIsMon(ApplyStatus.타지점근무);
        }
        if (dto.getWawIsTue() == ApplyStatus.배정 && dto.getWawTueWorkPlaceIdx() != null && !dto.getWawTueWorkPlaceIdx().equals(targetWorkPlaceIdx)) {
            dto.setWawIsTue(ApplyStatus.타지점근무);
        }
        if (dto.getWawIsWed() == ApplyStatus.배정 && dto.getWawWedWorkPlaceIdx() != null && !dto.getWawWedWorkPlaceIdx().equals(targetWorkPlaceIdx)) {
            dto.setWawIsWed(ApplyStatus.타지점근무);
        }
        if (dto.getWawIsThu() == ApplyStatus.배정 && dto.getWawThuWorkPlaceIdx() != null && !dto.getWawThuWorkPlaceIdx().equals(targetWorkPlaceIdx)) {
            dto.setWawIsThu(ApplyStatus.타지점근무);
        }
        if (dto.getWawIsFri() == ApplyStatus.배정 && dto.getWawFriWorkPlaceIdx() != null && !dto.getWawFriWorkPlaceIdx().equals(targetWorkPlaceIdx)) {
            dto.setWawIsFri(ApplyStatus.타지점근무);
        }
        if (dto.getWawIsSat() == ApplyStatus.배정 && dto.getWawSatWorkPlaceIdx() != null && !dto.getWawSatWorkPlaceIdx().equals(targetWorkPlaceIdx)) {
            dto.setWawIsSat(ApplyStatus.타지점근무);
        }
        if (dto.getWawIsSun() == ApplyStatus.배정 && dto.getWawSunWorkPlaceIdx() != null && !dto.getWawSunWorkPlaceIdx().equals(targetWorkPlaceIdx)) {
            dto.setWawIsSun(ApplyStatus.타지점근무);
        }
        return dto;
    }

    private WorkApplyWorkResponseDto mergeScheduleAndApply(User user, WorkApplyWork schedule, WorkApply apply, boolean isAdminView, Long targetWorkPlaceIdx, LocalDate queryDate) {
        if (schedule == null && apply == null) {
            return WorkApplyWorkResponseDto.emptyForUser(user, queryDate);
        }

        LocalDate date = schedule != null ? schedule.getWawDate() : (apply != null ? apply.getWaDate() : queryDate);
        WorkApplyWorkResponseDto dto;

        if (schedule != null) {
            dto = mapToDtoForWorkPlace(schedule, targetWorkPlaceIdx);
        } else {
            dto = WorkApplyWorkResponseDto.emptyForUser(user, date);
        }

        if (apply != null) {
            dto.setWaIdx(apply.getWaIdx());
        }

        boolean isConfirmed = schedule != null && schedule.getWawIsConfirmed();

        // Monday
        dto.setWawIsMon(resolveStatusForDay(isConfirmed, dto.getWawIsMon(), apply != null && apply.isWaIsMon(), isAdminView));
        dto.setWaIsMon(apply != null && apply.isWaIsMon() ? ApplyStatus.신청 : ApplyStatus.미신청);
        // Tuesday
        dto.setWawIsTue(resolveStatusForDay(isConfirmed, dto.getWawIsTue(), apply != null && apply.isWaIsTue(), isAdminView));
        dto.setWaIsTue(apply != null && apply.isWaIsTue() ? ApplyStatus.신청 : ApplyStatus.미신청);
        // Wednesday
        dto.setWawIsWed(resolveStatusForDay(isConfirmed, dto.getWawIsWed(), apply != null && apply.isWaIsWed(), isAdminView));
        dto.setWaIsWed(apply != null && apply.isWaIsWed() ? ApplyStatus.신청 : ApplyStatus.미신청);
        // Thursday
        dto.setWawIsThu(resolveStatusForDay(isConfirmed, dto.getWawIsThu(), apply != null && apply.isWaIsThu(), isAdminView));
        dto.setWaIsThu(apply != null && apply.isWaIsThu() ? ApplyStatus.신청 : ApplyStatus.미신청);
        // Friday
        dto.setWawIsFri(resolveStatusForDay(isConfirmed, dto.getWawIsFri(), apply != null && apply.isWaIsFri(), isAdminView));
        dto.setWaIsFri(apply != null && apply.isWaIsFri() ? ApplyStatus.신청 : ApplyStatus.미신청);
        // Saturday
        dto.setWawIsSat(resolveStatusForDay(isConfirmed, dto.getWawIsSat(), apply != null && apply.isWaIsSat(), isAdminView));
        dto.setWaIsSat(apply != null && apply.isWaIsSat() ? ApplyStatus.신청 : ApplyStatus.미신청);
        // Sunday
        dto.setWawIsSun(resolveStatusForDay(isConfirmed, dto.getWawIsSun(), apply != null && apply.isWaIsSun(), isAdminView));
        dto.setWaIsSun(apply != null && apply.isWaIsSun() ? ApplyStatus.신청 : ApplyStatus.미신청);

        if (apply != null) {
            dto.setWawRemarks(apply.getWaRemarks());
        }

        if (!isAdminView && !isConfirmed) {
            // Hide draft schedule details
            dto.setWawMonStartTime(null);
            dto.setWawTueStartTime(null);
            dto.setWawWedStartTime(null);
            dto.setWawThuStartTime(null);
            dto.setWawFriStartTime(null);
            dto.setWawSatStartTime(null);
            dto.setWawSunStartTime(null);
            dto.setWawMonWorkPlaceIdx(null);
            dto.setWawMonWorkPlaceName(null);
            dto.setWawTueWorkPlaceIdx(null);
            dto.setWawTueWorkPlaceName(null);
            dto.setWawWedWorkPlaceIdx(null);
            dto.setWawWedWorkPlaceName(null);
            dto.setWawThuWorkPlaceIdx(null);
            dto.setWawThuWorkPlaceName(null);
            dto.setWawFriWorkPlaceIdx(null);
            dto.setWawFriWorkPlaceName(null);
            dto.setWawSatWorkPlaceIdx(null);
            dto.setWawSatWorkPlaceName(null);
            dto.setWawSunWorkPlaceIdx(null);
            dto.setWawSunWorkPlaceName(null);
        }

        return dto;
    }

    private ApplyStatus resolveStatusForDay(boolean isConfirmed, ApplyStatus currentStatus, boolean requested, boolean isAdminView) {
        if (isAdminView) {
            if (currentStatus == ApplyStatus.배정 || currentStatus == ApplyStatus.타지점근무 || currentStatus == ApplyStatus.미배정) {
                return currentStatus;
            }
            return requested ? ApplyStatus.신청 : ApplyStatus.미신청;
        } else {
            if (isConfirmed) {
                if (currentStatus == ApplyStatus.배정 || currentStatus == ApplyStatus.타지점근무) {
                    return currentStatus;
                }
                return requested ? ApplyStatus.미배정 : ApplyStatus.미신청;
            } else {
                return requested ? ApplyStatus.신청 : ApplyStatus.미신청;
            }
        }
    }

    @Override
    @Transactional
    public void createWorkApplyWork(String requesterId, WorkApplyWorkRequestDto requestDto) {
        User requester = getRequester(requesterId);
        
        User targetUser = requester;
        if (isAdmin(requester) && requestDto.getUserIdx() != null) {
            targetUser = userRepository.findById(requestDto.getUserIdx())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "대리 신청할 사용자를 찾을 수 없습니다."));
        }

        checkDeadline(requestDto.getWawDate(), requester);

        // 월~일 모두 미신청인 경우 DB에 불필요한 레코드를 생성하지 않음
        if (isAllUnapplied(requestDto)) {
            return;
        }

        // DB에 저장할 때도 무조건 해당 주의 '월요일'로 통일해서 저장
        LocalDate targetMonday = requestDto.getWawDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        if (workApplyWorkRepository.existsByUser_UserIdxAndWawDate(targetUser.getUserIdx(), targetMonday)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "해당 주차(날짜)에 이미 근무 신청 내역이 존재합니다.");
        }

        WorkPlace defaultWp = targetUser.getWorkPlace();

        WorkApplyWork workApplyWork = WorkApplyWork.builder()
                .user(targetUser)
                .wawDate(targetMonday)
                .wawIsMon(requestDto.getWawIsMon() != null ? requestDto.getWawIsMon() : ApplyStatus.미신청)
                .wawIsTue(requestDto.getWawIsTue() != null ? requestDto.getWawIsTue() : ApplyStatus.미신청)
                .wawIsWed(requestDto.getWawIsWed() != null ? requestDto.getWawIsWed() : ApplyStatus.미신청)
                .wawIsThu(requestDto.getWawIsThu() != null ? requestDto.getWawIsThu() : ApplyStatus.미신청)
                .wawIsFri(requestDto.getWawIsFri() != null ? requestDto.getWawIsFri() : ApplyStatus.미신청)
                .wawIsSat(requestDto.getWawIsSat() != null ? requestDto.getWawIsSat() : ApplyStatus.미신청)
                .wawIsSun(requestDto.getWawIsSun() != null ? requestDto.getWawIsSun() : ApplyStatus.미신청)
                .wawMonStartTime(requestDto.getWawMonStartTime())
                .wawTueStartTime(requestDto.getWawTueStartTime())
                .wawWedStartTime(requestDto.getWawWedStartTime())
                .wawThuStartTime(requestDto.getWawThuStartTime())
                .wawFriStartTime(requestDto.getWawFriStartTime())
                .wawSatStartTime(requestDto.getWawSatStartTime())
                .wawSunStartTime(requestDto.getWawSunStartTime())
                .wawMonWorkPlace(resolveWorkPlace(requestDto.getWawMonWorkPlaceIdx(), defaultWp))
                .wawTueWorkPlace(resolveWorkPlace(requestDto.getWawTueWorkPlaceIdx(), defaultWp))
                .wawWedWorkPlace(resolveWorkPlace(requestDto.getWawWedWorkPlaceIdx(), defaultWp))
                .wawThuWorkPlace(resolveWorkPlace(requestDto.getWawThuWorkPlaceIdx(), defaultWp))
                .wawFriWorkPlace(resolveWorkPlace(requestDto.getWawFriWorkPlaceIdx(), defaultWp))
                .wawSatWorkPlace(resolveWorkPlace(requestDto.getWawSatWorkPlaceIdx(), defaultWp))
                .wawSunWorkPlace(resolveWorkPlace(requestDto.getWawSunWorkPlaceIdx(), defaultWp))
                .wawRemarks(requestDto.getWawRemarks())
                .wawIsConfirmed(requestDto.getWawIsConfirmed() != null ? requestDto.getWawIsConfirmed() : false)
                .build();

        workApplyWorkRepository.save(workApplyWork);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkApplyWorkResponseDto> getAllWorkApplyWorks(String requesterId, Long workPlaceIdx, LocalDate wawDate) {
        User requester = getRequester(requesterId);
        boolean isAdminView = isAdmin(requester);

        if (!isAdminView) {
            List<WorkApply> applies;
            List<WorkApplyWork> schedules;
            if (wawDate != null) {
                LocalDate targetMonday = wawDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                applies = workApplyRepository.findByUser_UserIdxAndWaDate(requester.getUserIdx(), targetMonday)
                        .map(List::of).orElseGet(List::of);
                schedules = workApplyWorkRepository.findByUser_UserIdxAndWawDate(requester.getUserIdx(), targetMonday)
                        .map(List::of).orElseGet(List::of);
            } else {
                applies = workApplyRepository.findByUser_UserIdx(requester.getUserIdx());
                schedules = workApplyWorkRepository.findByUser_UserIdx(requester.getUserIdx());
            }

            Map<LocalDate, WorkApply> applyMap = applies.stream()
                    .collect(Collectors.toMap(WorkApply::getWaDate, a -> a, (a1, a2) -> a1));
            Map<LocalDate, WorkApplyWork> scheduleMap = schedules.stream()
                    .collect(Collectors.toMap(WorkApplyWork::getWawDate, s -> s, (s1, s2) -> s1));

            Set<LocalDate> allDates = new TreeSet<>(Comparator.reverseOrder());
            allDates.addAll(applyMap.keySet());
            allDates.addAll(scheduleMap.keySet());

            return allDates.stream()
                    .map(date -> mergeScheduleAndApply(requester, scheduleMap.get(date), applyMap.get(date), false, null, date))
                    .collect(Collectors.toList());
        }

        if (wawDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "관리자는 조회할 주차(wawDate)가 필수입니다.");
        }
        LocalDate targetMonday = wawDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        List<WorkApply> applies = workApplyRepository.findByWaDateFetch(targetMonday);
        List<WorkApplyWork> schedules = workApplyWorkRepository.findByWawDateFetch(targetMonday);

        List<User> targetUsers;
        if (workPlaceIdx != null) {
            List<User> homeUsers = userRepository.findByWorkPlace_WpIdx(workPlaceIdx);
            Map<Long, User> userMap = new LinkedHashMap<>();
            for (User u : homeUsers) {
                if (u.getUserIsActive() != null && u.getUserIsActive() == 1 && !isAdmin(u)) {
                    userMap.put(u.getUserIdx(), u);
                }
            }
            for (WorkApplyWork schedule : schedules) {
                if (isAssignedToWorkPlace(schedule, workPlaceIdx)) {
                    User dispatcher = schedule.getUser();
                    if (dispatcher != null && dispatcher.getUserIsActive() != null && dispatcher.getUserIsActive() == 1 && !isAdmin(dispatcher)) {
                        userMap.putIfAbsent(dispatcher.getUserIdx(), dispatcher);
                    }
                }
            }
            targetUsers = new ArrayList<>(userMap.values());
        } else {
            targetUsers = userRepository.findAll().stream()
                    .filter(u -> u.getUserIsActive() != null && u.getUserIsActive() == 1 && !isAdmin(u))
                    .collect(Collectors.toList());
        }

        Map<Long, WorkApply> applyMap = applies.stream()
                .collect(Collectors.toMap(a -> a.getUser().getUserIdx(), a -> a, (a1, a2) -> a1));
        Map<Long, WorkApplyWork> scheduleMap = schedules.stream()
                .collect(Collectors.toMap(s -> s.getUser().getUserIdx(), s -> s, (s1, s2) -> s1));

        return targetUsers.stream()
                .map(user -> mergeScheduleAndApply(user, scheduleMap.get(user.getUserIdx()), applyMap.get(user.getUserIdx()), true, workPlaceIdx, targetMonday))
                .sorted(Comparator.comparing(WorkApplyWorkResponseDto::getUserName, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(WorkApplyWorkResponseDto::getUserIdx))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkApplyWorkResponseDto> getMonthlyWorkApplyWorks(String requesterId, int year, int month) {
        User requester = getRequester(requesterId);
        
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate firstDayOfMonth = yearMonth.atDay(1);
        LocalDate lastDayOfMonth = yearMonth.atEndOfMonth();
        
        LocalDate startDate = firstDayOfMonth.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endDate = lastDayOfMonth.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        List<WorkApply> applies = workApplyRepository.findByUserIdxAndWaDateBetweenFetch(requester.getUserIdx(), startDate, endDate);
        List<WorkApplyWork> schedules = workApplyWorkRepository.findByUserIdxAndWawDateBetweenFetch(requester.getUserIdx(), startDate, endDate);
        
        Map<LocalDate, WorkApply> applyMap = applies.stream()
                .collect(Collectors.toMap(WorkApply::getWaDate, a -> a, (a1, a2) -> a1));
        Map<LocalDate, WorkApplyWork> scheduleMap = schedules.stream()
                .collect(Collectors.toMap(WorkApplyWork::getWawDate, s -> s, (s1, s2) -> s1));

        Set<LocalDate> allDates = new TreeSet<>(Comparator.reverseOrder());
        allDates.addAll(applyMap.keySet());
        allDates.addAll(scheduleMap.keySet());

        return allDates.stream()
                .map(date -> mergeScheduleAndApply(requester, scheduleMap.get(date), applyMap.get(date), false, null, date))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Integer> getCalendarAssignmentCounts(String requesterId, int year, int month, Long workPlaceIdx) {
        User requester = getRequester(requesterId);
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate firstDayOfMonth = yearMonth.atDay(1);
        LocalDate lastDayOfMonth = yearMonth.atEndOfMonth();
        
        LocalDate startDate = firstDayOfMonth.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
        LocalDate endDate = lastDayOfMonth.with(TemporalAdjusters.nextOrSame(DayOfWeek.SATURDAY));
        
        List<WorkApplyWork> applies;
        if (isAdmin(requester)) {
            applies = workApplyWorkRepository.findByWawDateBetween(startDate.minusDays(7), endDate);
        } else {
            applies = List.of();
        }

        Map<String, Integer> counts = new LinkedHashMap<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            counts.put(date.toString(), 0);
        }
        
        for (WorkApplyWork apply : applies) {
            LocalDate monday = apply.getWawDate();
            for (int i = 0; i < 7; i++) {
                LocalDate date = monday.plusDays(i);
                DayOfWeek day = date.getDayOfWeek();
                ApplyStatus status = getDayStatus(apply, day);
                if (status == ApplyStatus.배정 || status == ApplyStatus.타지점근무) {
                    WorkPlace wp = getDayWorkPlace(apply, day);
                    if (workPlaceIdx == null || (wp != null && workPlaceIdx.equals(wp.getWpIdx()))) {
                        if (counts.containsKey(date.toString())) {
                            counts.put(date.toString(), counts.get(date.toString()) + 1);
                        }
                    }
                }
            }
        }
        
        return counts;
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto> getDailySchedule(String requesterId, LocalDate date, Long workPlaceIdx) {
        User requester = getRequester(requesterId);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 일별 스케줄을 조회할 수 있습니다.");
        }

        LocalDate monday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<WorkApplyWork> applies = workApplyWorkRepository.findByWawDate(monday);

        return applies.stream()
                .filter(apply -> {
                    DayOfWeek dayOfWeek = date.getDayOfWeek();
                    ApplyStatus status = getDayStatus(apply, dayOfWeek);
                    if (status != ApplyStatus.배정 && status != ApplyStatus.타지점근무) {
                        return false;
                    }
                    WorkPlace wp = getDayWorkPlace(apply, dayOfWeek);
                    return workPlaceIdx == null || (wp != null && workPlaceIdx.equals(wp.getWpIdx()));
                })
                .map(apply -> {
                    DayOfWeek dayOfWeek = date.getDayOfWeek();
                    java.time.LocalTime time;
                    switch (dayOfWeek) {
                        case MONDAY: time = apply.getWawMonStartTime(); break;
                        case TUESDAY: time = apply.getWawTueStartTime(); break;
                        case WEDNESDAY: time = apply.getWawWedStartTime(); break;
                        case THURSDAY: time = apply.getWawThuStartTime(); break;
                        case FRIDAY: time = apply.getWawFriStartTime(); break;
                        case SATURDAY: time = apply.getWawSatStartTime(); break;
                        case SUNDAY: time = apply.getWawSunStartTime(); break;
                        default: time = null;
                    }
                    
                    String startTime = time != null ? time.toString() : null;
                    if (startTime != null && startTime.length() > 5) {
                        startTime = startTime.substring(0, 5);
                    }

                    return com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto.from(apply.getUser(), startTime);
                })
                .sorted(Comparator.comparing(com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public WorkApplyWorkResponseDto getWorkApplyWorkById(String requesterId, Long wawIdx) {
        User requester = getRequester(requesterId);
        WorkApplyWork apply = workApplyWorkRepository.findById(wawIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "근무 신청 내역을 찾을 수 없습니다."));

        if (!isAdmin(requester) && !apply.getUser().getUserIdx().equals(requester.getUserIdx())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 신청 내역만 조회할 수 있습니다.");
        }

        return mapToDto(apply);
    }

    @Override
    @Transactional
    public void updateWorkApplyWork(String requesterId, Long wawIdx, WorkApplyWorkRequestDto requestDto) {
        User requester = getRequester(requesterId);
        WorkApplyWork apply = workApplyWorkRepository.findById(wawIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 근무 신청 내역을 찾을 수 없습니다."));

        if (!isAdmin(requester) && !apply.getUser().getUserIdx().equals(requester.getUserIdx())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 신청 내역만 수정할 수 있습니다.");
        }

        if (requestDto.getWawDate() != null) {
            LocalDate targetMonday = requestDto.getWawDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            
            if (!targetMonday.equals(apply.getWawDate())) {
                checkDeadline(targetMonday, requester);
                if (workApplyWorkRepository.existsByUser_UserIdxAndWawDate(apply.getUser().getUserIdx(), targetMonday)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "변경하려는 주차(날짜)에 이미 근무 신청 내역이 존재합니다.");
                }
                apply.setWawDate(targetMonday);
            } else {
                checkDeadline(apply.getWawDate(), requester);
            }
        } else {
            checkDeadline(apply.getWawDate(), requester);
        }

        WorkPlace defaultWp = apply.getUser().getWorkPlace();

        // 월요일
        if (requestDto.getWawIsMon() != null) apply.setWawIsMon(requestDto.getWawIsMon());
        apply.setWawMonStartTime(requestDto.getWawMonStartTime());
        if (requestDto.getWawMonWorkPlaceIdx() != null) {
            apply.setWawMonWorkPlace(resolveWorkPlace(requestDto.getWawMonWorkPlaceIdx(), defaultWp));
        } else if (apply.getWawIsMon() == ApplyStatus.배정) {
            apply.setWawMonWorkPlace(defaultWp);
        } else {
            apply.setWawMonWorkPlace(null);
        }

        // 화요일
        if (requestDto.getWawIsTue() != null) apply.setWawIsTue(requestDto.getWawIsTue());
        apply.setWawTueStartTime(requestDto.getWawTueStartTime());
        if (requestDto.getWawTueWorkPlaceIdx() != null) {
            apply.setWawTueWorkPlace(resolveWorkPlace(requestDto.getWawTueWorkPlaceIdx(), defaultWp));
        } else if (apply.getWawIsTue() == ApplyStatus.배정) {
            apply.setWawTueWorkPlace(defaultWp);
        } else {
            apply.setWawTueWorkPlace(null);
        }

        // 수요일
        if (requestDto.getWawIsWed() != null) apply.setWawIsWed(requestDto.getWawIsWed());
        apply.setWawWedStartTime(requestDto.getWawWedStartTime());
        if (requestDto.getWawWedWorkPlaceIdx() != null) {
            apply.setWawWedWorkPlace(resolveWorkPlace(requestDto.getWawWedWorkPlaceIdx(), defaultWp));
        } else if (apply.getWawIsWed() == ApplyStatus.배정) {
            apply.setWawWedWorkPlace(defaultWp);
        } else {
            apply.setWawWedWorkPlace(null);
        }

        // 목요일
        if (requestDto.getWawIsThu() != null) apply.setWawIsThu(requestDto.getWawIsThu());
        apply.setWawThuStartTime(requestDto.getWawThuStartTime());
        if (requestDto.getWawThuWorkPlaceIdx() != null) {
            apply.setWawThuWorkPlace(resolveWorkPlace(requestDto.getWawThuWorkPlaceIdx(), defaultWp));
        } else if (apply.getWawIsThu() == ApplyStatus.배정) {
            apply.setWawThuWorkPlace(defaultWp);
        } else {
            apply.setWawThuWorkPlace(null);
        }

        // 금요일
        if (requestDto.getWawIsFri() != null) apply.setWawIsFri(requestDto.getWawIsFri());
        apply.setWawFriStartTime(requestDto.getWawFriStartTime());
        if (requestDto.getWawFriWorkPlaceIdx() != null) {
            apply.setWawFriWorkPlace(resolveWorkPlace(requestDto.getWawFriWorkPlaceIdx(), defaultWp));
        } else if (apply.getWawIsFri() == ApplyStatus.배정) {
            apply.setWawFriWorkPlace(defaultWp);
        } else {
            apply.setWawFriWorkPlace(null);
        }

        // 토요일
        if (requestDto.getWawIsSat() != null) apply.setWawIsSat(requestDto.getWawIsSat());
        apply.setWawSatStartTime(requestDto.getWawSatStartTime());
        if (requestDto.getWawSatWorkPlaceIdx() != null) {
            apply.setWawSatWorkPlace(resolveWorkPlace(requestDto.getWawSatWorkPlaceIdx(), defaultWp));
        } else if (apply.getWawIsSat() == ApplyStatus.배정) {
            apply.setWawSatWorkPlace(defaultWp);
        } else {
            apply.setWawSatWorkPlace(null);
        }

        // 일요일
        if (requestDto.getWawIsSun() != null) apply.setWawIsSun(requestDto.getWawIsSun());
        apply.setWawSunStartTime(requestDto.getWawSunStartTime());
        if (requestDto.getWawSunWorkPlaceIdx() != null) {
            apply.setWawSunWorkPlace(resolveWorkPlace(requestDto.getWawSunWorkPlaceIdx(), defaultWp));
        } else if (apply.getWawIsSun() == ApplyStatus.배정) {
            apply.setWawSunWorkPlace(defaultWp);
        } else {
            apply.setWawSunWorkPlace(null);
        }

        if (requestDto.getWawRemarks() != null) apply.setWawRemarks(requestDto.getWawRemarks());
        if (requestDto.getWawIsConfirmed() != null) apply.setWawIsConfirmed(requestDto.getWawIsConfirmed());

        // 모든 요일이 미신청인 경우 DB 레코드를 삭제하여 미신청 상태로 유지
        if (isAllUnapplied(apply)) {
            workApplyWorkRepository.delete(apply);
            return;
        }

        workApplyWorkRepository.save(apply);
    }

    @Override
    @Transactional
    public void deleteWorkApplyWork(String requesterId, Long wawIdx) {
        User requester = getRequester(requesterId);
        
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "근무 신청 내역은 관리자만 삭제할 수 있습니다.");
        }

        WorkApplyWork apply = workApplyWorkRepository.findById(wawIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 근무 신청 내역을 찾을 수 없습니다."));

        workApplyWorkRepository.delete(apply);
    }

    private WorkApplyWorkResponseDto mapToDto(WorkApplyWork apply) {
        return WorkApplyWorkResponseDto.fromEntity(apply);
    }

    // --- 알바생 근무 신청 (WorkApply) API 구현 ---
    @Override
    @Transactional
    public void createWorkApply(String requesterId, WorkApplyWorkRequestDto requestDto) {
        User requester = getRequester(requesterId);
        User targetUser = requester;
        if (isAdmin(requester) && requestDto.getUserIdx() != null) {
            targetUser = userRepository.findById(requestDto.getUserIdx())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "대리 신청할 사용자를 찾을 수 없습니다."));
        }

        checkDeadline(requestDto.getWawDate(), requester);

        LocalDate targetMonday = requestDto.getWawDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        if (workApplyRepository.findByUser_UserIdxAndWaDate(targetUser.getUserIdx(), targetMonday).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "해당 주차(날짜)에 이미 근무 신청 내역이 존재합니다.");
        }

        WorkApply workApply = WorkApply.builder()
                .user(targetUser)
                .waDate(targetMonday)
                .waIsMon(requestDto.getWawIsMon() == ApplyStatus.신청)
                .waIsTue(requestDto.getWawIsTue() == ApplyStatus.신청)
                .waIsWed(requestDto.getWawIsWed() == ApplyStatus.신청)
                .waIsThu(requestDto.getWawIsThu() == ApplyStatus.신청)
                .waIsFri(requestDto.getWawIsFri() == ApplyStatus.신청)
                .waIsSat(requestDto.getWawIsSat() == ApplyStatus.신청)
                .waIsSun(requestDto.getWawIsSun() == ApplyStatus.신청)
                .waRemarks(requestDto.getWawRemarks())
                .build();

        workApplyRepository.save(workApply);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkApplyWorkResponseDto> getWorkApplies(String requesterId, LocalDate waDate) {
        User requester = getRequester(requesterId);
        
        List<WorkApply> applies;
        if (waDate != null) {
            LocalDate targetMonday = waDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            if (isAdmin(requester)) {
                applies = workApplyRepository.findByWaDateFetch(targetMonday);
            } else {
                Optional<WorkApply> apply = workApplyRepository.findByUser_UserIdxAndWaDate(requester.getUserIdx(), targetMonday);
                applies = apply.map(List::of).orElseGet(List::of);
            }
        } else {
            if (isAdmin(requester)) {
                applies = workApplyRepository.findAll();
            } else {
                applies = workApplyRepository.findByUser_UserIdx(requester.getUserIdx());
            }
        }

        return applies.stream()
                .map(WorkApplyWorkResponseDto::fromApplyEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public WorkApplyWorkResponseDto getWorkApplyById(String requesterId, Long waIdx) {
        User requester = getRequester(requesterId);
        WorkApply apply = workApplyRepository.findById(waIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "근무 신청 내역을 찾을 수 없습니다."));

        if (!isAdmin(requester) && !apply.getUser().getUserIdx().equals(requester.getUserIdx())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 신청 내역만 조회할 수 있습니다.");
        }

        return WorkApplyWorkResponseDto.fromApplyEntity(apply);
    }

    @Override
    @Transactional
    public void updateWorkApply(String requesterId, Long waIdx, WorkApplyWorkRequestDto requestDto) {
        User requester = getRequester(requesterId);
        WorkApply apply = workApplyRepository.findById(waIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 근무 신청 내역을 찾을 수 없습니다."));

        if (!isAdmin(requester) && !apply.getUser().getUserIdx().equals(requester.getUserIdx())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 신청 내역만 수정할 수 있습니다.");
        }

        if (requestDto.getWawDate() != null) {
            LocalDate targetMonday = requestDto.getWawDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            if (!targetMonday.equals(apply.getWaDate())) {
                checkDeadline(targetMonday, requester);
                if (workApplyRepository.findByUser_UserIdxAndWaDate(apply.getUser().getUserIdx(), targetMonday).isPresent()) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "변경하려는 주차(날짜)에 이미 근무 신청 내역이 존재합니다.");
                }
                apply.setWaDate(targetMonday);
            } else {
                checkDeadline(apply.getWaDate(), requester);
            }
        } else {
            checkDeadline(apply.getWaDate(), requester);
        }

        if (requestDto.getWawIsMon() != null) apply.setWaIsMon(requestDto.getWawIsMon() == ApplyStatus.신청);
        if (requestDto.getWawIsTue() != null) apply.setWaIsTue(requestDto.getWawIsTue() == ApplyStatus.신청);
        if (requestDto.getWawIsWed() != null) apply.setWaIsWed(requestDto.getWawIsWed() == ApplyStatus.신청);
        if (requestDto.getWawIsThu() != null) apply.setWaIsThu(requestDto.getWawIsThu() == ApplyStatus.신청);
        if (requestDto.getWawIsFri() != null) apply.setWaIsFri(requestDto.getWawIsFri() == ApplyStatus.신청);
        if (requestDto.getWawIsSat() != null) apply.setWaIsSat(requestDto.getWawIsSat() == ApplyStatus.신청);
        if (requestDto.getWawIsSun() != null) apply.setWaIsSun(requestDto.getWawIsSun() == ApplyStatus.신청);
        
        apply.setWaRemarks(requestDto.getWawRemarks());

        workApplyRepository.save(apply);
    }

    @Override
    @Transactional
    public void deleteWorkApply(String requesterId, Long waIdx) {
        User requester = getRequester(requesterId);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "근무 신청 내역은 관리자만 삭제할 수 있습니다.");
        }

        WorkApply apply = workApplyRepository.findById(waIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 근무 신청 내역을 찾을 수 없습니다."));

        workApplyRepository.delete(apply);
    }
}
