package com.recode.Dwaeji.work_apply_work.impl;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.work_apply_work.database.WorkApplyWork;
import com.recode.Dwaeji.work_apply_work.dto.WorkApplyWorkRequestDto;
import com.recode.Dwaeji.work_apply_work.dto.WorkApplyWorkResponseDto;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyWorkRepository;
import com.recode.Dwaeji.work_apply_work.service.WorkApplyWorkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;
import java.util.Comparator;
import java.util.Optional;
import com.recode.Dwaeji.work_apply_work.database.ApplyStatus;

@Service
@RequiredArgsConstructor
public class WorkApplyWorkServiceImpl implements WorkApplyWorkService {

    private final WorkApplyWorkRepository workApplyWorkRepository;
    private final UserRepository userRepository;

    private User getRequester(String requesterId) {
        return userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
    }

    private boolean isAdmin(User user) {
        return user.getUserType() != null && user.getUserType().getUtIsAdmin() != null && user.getUserType().getUtIsAdmin() == 1;
    }

    private void checkDeadline(java.time.LocalDate wawDate, User requester) {
        if (isAdmin(requester)) return;
        
        // 프론트에서 어떤 요일을 보내든 강제로 해당 주의 '월요일'을 기준으로 마감일 계산
        java.time.LocalDate monday = wawDate.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        java.time.LocalDateTime deadline = monday.minusDays(1).atStartOfDay(); // 일요일 00:00:00
        
        if (java.time.LocalDateTime.now().isAfter(deadline)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 주차의 근무 신청/수정 마감 기한(일요일 00:00)이 지났습니다.");
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

        // DB에 저장할 때도 무조건 해당 주의 '월요일'로 통일해서 저장
        java.time.LocalDate targetMonday = requestDto.getWawDate().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));

        if (workApplyWorkRepository.existsByUser_UserIdxAndWawDate(targetUser.getUserIdx(), targetMonday)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "해당 주차(날짜)에 이미 근무 신청 내역이 존재합니다.");
        }

        WorkApplyWork workApplyWork = WorkApplyWork.builder()
                .user(targetUser)
                .wawDate(targetMonday)
                .wawIsMon(requestDto.getWawIsMon())
                .wawIsTue(requestDto.getWawIsTue())
                .wawIsWed(requestDto.getWawIsWed())
                .wawIsThu(requestDto.getWawIsThu())
                .wawIsFri(requestDto.getWawIsFri())
                .wawIsSat(requestDto.getWawIsSat())
                .wawIsSun(requestDto.getWawIsSun())
                .wawMonStartTime(requestDto.getWawMonStartTime())
                .wawTueStartTime(requestDto.getWawTueStartTime())
                .wawWedStartTime(requestDto.getWawWedStartTime())
                .wawThuStartTime(requestDto.getWawThuStartTime())
                .wawFriStartTime(requestDto.getWawFriStartTime())
                .wawSatStartTime(requestDto.getWawSatStartTime())
                .wawSunStartTime(requestDto.getWawSunStartTime())
                .wawRemarks(requestDto.getWawRemarks())
                .build();

        workApplyWorkRepository.save(workApplyWork);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkApplyWorkResponseDto> getAllWorkApplyWorks(String requesterId, Long workPlaceIdx, LocalDate wawDate) {
        User requester = getRequester(requesterId);

        if (!isAdmin(requester)) {
            // 일반 유저인 경우
            List<WorkApplyWork> applies;
            if (wawDate != null) {
                Optional<WorkApplyWork> apply = workApplyWorkRepository.findByUser_UserIdxAndWawDate(requester.getUserIdx(), wawDate);
                applies = apply.map(List::of).orElseGet(List::of);
            } else {
                applies = workApplyWorkRepository.findByUser_UserIdx(requester.getUserIdx());
            }
            return applies.stream()
                    .map(this::mapToDto)
                    .sorted(Comparator.comparing(WorkApplyWorkResponseDto::getWawDate).reversed())
                    .collect(Collectors.toList());
        }

        // 관리자인 경우
        List<User> targetUsers;
        List<WorkApplyWork> applies;

        if (workPlaceIdx != null) {
            targetUsers = userRepository.findByWorkPlace_WpIdx(workPlaceIdx);
            if (wawDate != null) {
                applies = workApplyWorkRepository.findByUser_WorkPlace_WpIdxAndWawDate(workPlaceIdx, wawDate);
            } else {
                applies = workApplyWorkRepository.findAll();
            }
        } else {
            targetUsers = userRepository.findAll();
            if (wawDate != null) {
                applies = workApplyWorkRepository.findByWawDate(wawDate);
            } else {
                applies = workApplyWorkRepository.findAll();
            }
        }

        Map<Long, WorkApplyWork> applyMap = applies.stream()
                .collect(Collectors.toMap(a -> a.getUser().getUserIdx(), a -> a, (a1, a2) -> a1));

        return targetUsers.stream()
                .filter(user -> !isAdmin(user)) // 관리자 계정 제외
                .map(user -> {
                    WorkApplyWork apply = applyMap.get(user.getUserIdx());
                    if (apply != null) {
                        return mapToDto(apply);
                    } else {
                        return WorkApplyWorkResponseDto.builder()
                                .userIdx(user.getUserIdx())
                                .userName(user.getUserName())
                                .workPlaceName(user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : null)
                                .build();
                    }
                })
                .sorted(Comparator.comparing(WorkApplyWorkResponseDto::getUserName))
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
        if (isAdmin(requester) && workPlaceIdx != null) {
            applies = workApplyWorkRepository.findByUser_WorkPlace_WpIdxAndWawDateBetween(workPlaceIdx, startDate.minusDays(7), endDate);
        } else if (isAdmin(requester)) {
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
            checkAndIncrementCount(counts, monday, apply.getWawIsMon());
            checkAndIncrementCount(counts, monday.plusDays(1), apply.getWawIsTue());
            checkAndIncrementCount(counts, monday.plusDays(2), apply.getWawIsWed());
            checkAndIncrementCount(counts, monday.plusDays(3), apply.getWawIsThu());
            checkAndIncrementCount(counts, monday.plusDays(4), apply.getWawIsFri());
            checkAndIncrementCount(counts, monday.plusDays(5), apply.getWawIsSat());
            checkAndIncrementCount(counts, monday.plusDays(6), apply.getWawIsSun());
        }
        
        return counts;
    }

    private void checkAndIncrementCount(Map<String, Integer> counts, LocalDate date, ApplyStatus status) {
        if (status == ApplyStatus.배정 && counts.containsKey(date.toString())) {
            counts.put(date.toString(), counts.get(date.toString()) + 1);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto> getDailySchedule(String requesterId, LocalDate date, Long workPlaceIdx) {
        User requester = getRequester(requesterId);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 일별 스케줄을 조회할 수 있습니다.");
        }

        LocalDate monday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<WorkApplyWork> applies;
        
        if (workPlaceIdx != null) {
            applies = workApplyWorkRepository.findByUser_WorkPlace_WpIdxAndWawDate(workPlaceIdx, monday);
        } else {
            applies = workApplyWorkRepository.findByWawDate(monday);
        }

        return applies.stream()
                .filter(apply -> {
                    DayOfWeek dayOfWeek = date.getDayOfWeek();
                    ApplyStatus status;
                    switch (dayOfWeek) {
                        case MONDAY: status = apply.getWawIsMon(); break;
                        case TUESDAY: status = apply.getWawIsTue(); break;
                        case WEDNESDAY: status = apply.getWawIsWed(); break;
                        case THURSDAY: status = apply.getWawIsThu(); break;
                        case FRIDAY: status = apply.getWawIsFri(); break;
                        case SATURDAY: status = apply.getWawIsSat(); break;
                        case SUNDAY: status = apply.getWawIsSun(); break;
                        default: status = null;
                    }
                    return status == ApplyStatus.배정;
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

                    return com.recode.Dwaeji.work_apply_work.dto.DailyScheduleDto.builder()
                            .userIdx(apply.getUser().getUserIdx())
                            .userName(apply.getUser().getUserName())
                            .workPlaceName(apply.getUser().getWorkPlace() != null ? apply.getUser().getWorkPlace().getWpName() : null)
                            .startTime(startTime)
                            .build();
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
            java.time.LocalDate targetMonday = requestDto.getWawDate().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
            
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

        if (requestDto.getWawIsMon() != null) apply.setWawIsMon(requestDto.getWawIsMon());
        if (requestDto.getWawIsTue() != null) apply.setWawIsTue(requestDto.getWawIsTue());
        if (requestDto.getWawIsWed() != null) apply.setWawIsWed(requestDto.getWawIsWed());
        if (requestDto.getWawIsThu() != null) apply.setWawIsThu(requestDto.getWawIsThu());
        if (requestDto.getWawIsFri() != null) apply.setWawIsFri(requestDto.getWawIsFri());
        if (requestDto.getWawIsSat() != null) apply.setWawIsSat(requestDto.getWawIsSat());
        if (requestDto.getWawIsSun() != null) apply.setWawIsSun(requestDto.getWawIsSun());
        
        if (requestDto.getWawMonStartTime() != null) apply.setWawMonStartTime(requestDto.getWawMonStartTime());
        if (requestDto.getWawTueStartTime() != null) apply.setWawTueStartTime(requestDto.getWawTueStartTime());
        if (requestDto.getWawWedStartTime() != null) apply.setWawWedStartTime(requestDto.getWawWedStartTime());
        if (requestDto.getWawThuStartTime() != null) apply.setWawThuStartTime(requestDto.getWawThuStartTime());
        if (requestDto.getWawFriStartTime() != null) apply.setWawFriStartTime(requestDto.getWawFriStartTime());
        if (requestDto.getWawSatStartTime() != null) apply.setWawSatStartTime(requestDto.getWawSatStartTime());
        if (requestDto.getWawSunStartTime() != null) apply.setWawSunStartTime(requestDto.getWawSunStartTime());

        if (requestDto.getWawRemarks() != null) apply.setWawRemarks(requestDto.getWawRemarks());

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
        return WorkApplyWorkResponseDto.builder()
                .wawIdx(apply.getWawIdx())
                .userIdx(apply.getUser().getUserIdx())
                .userName(apply.getUser().getUserName())
                .workPlaceName(apply.getUser().getWorkPlace() != null ? apply.getUser().getWorkPlace().getWpName() : null)
                .wawDate(apply.getWawDate())
                .wawIsMon(apply.getWawIsMon())
                .wawIsTue(apply.getWawIsTue())
                .wawIsWed(apply.getWawIsWed())
                .wawIsThu(apply.getWawIsThu())
                .wawIsFri(apply.getWawIsFri())
                .wawIsSat(apply.getWawIsSat())
                .wawIsSun(apply.getWawIsSun())
                .wawMonStartTime(apply.getWawMonStartTime())
                .wawTueStartTime(apply.getWawTueStartTime())
                .wawWedStartTime(apply.getWawWedStartTime())
                .wawThuStartTime(apply.getWawThuStartTime())
                .wawFriStartTime(apply.getWawFriStartTime())
                .wawSatStartTime(apply.getWawSatStartTime())
                .wawSunStartTime(apply.getWawSunStartTime())
                .wawRemarks(apply.getWawRemarks())
                .wawCreatedAt(apply.getWawCreatedAt())
                .wawUpdatedAt(apply.getWawUpdatedAt())
                .build();
    }
}
