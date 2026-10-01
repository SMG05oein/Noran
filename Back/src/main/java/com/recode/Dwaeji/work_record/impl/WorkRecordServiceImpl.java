package com.recode.Dwaeji.work_record.impl;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.user.repository.WorkPlaceRepository;
import com.recode.Dwaeji.work_apply_work.database.ApplyStatus;
import com.recode.Dwaeji.work_apply_work.database.WorkApplyDaily;
import com.recode.Dwaeji.work_apply_work.database.WorkScheduleDaily;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyDailyRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkScheduleDailyRepository;
import com.recode.Dwaeji.work_record.database.WorkRecord;
import com.recode.Dwaeji.work_record.database.WorkRecordHistory;
import com.recode.Dwaeji.work_record.dto.WorkRecordHistoryResponseDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordRequestDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordResponseDto;
import com.recode.Dwaeji.work_record.repository.WorkRecordHistoryRepository;
import com.recode.Dwaeji.work_record.repository.WorkRecordRepository;
import com.recode.Dwaeji.work_record.service.WorkRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkRecordServiceImpl implements WorkRecordService {

    private final WorkRecordRepository workRecordRepository;
    private final UserRepository userRepository;
    private final WorkRecordHistoryRepository workRecordHistoryRepository;
    private final WorkScheduleDailyRepository workScheduleDailyRepository;
    private final WorkApplyDailyRepository workApplyDailyRepository;
    private final WorkPlaceRepository workPlaceRepository;
    private final com.recode.Dwaeji.user.repository.UserTypeRepository userTypeRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Value("${work-record.edit-deadline-day-of-month:1}")
    private int editDeadlineDayOfMonth;

    @Value("${work-record.edit-deadline-time:23:59:59}")
    private String editDeadlineTime;

    private User getRequester(String requesterId) {
        return userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
    }

    private boolean isAdmin(User user) {
        return user.getUserType() != null && user.getUserType().getUtIsAdmin() != null && user.getUserType().getUtIsAdmin() == 1;
    }

    private java.time.LocalDateTime resolveEditDeadline(java.time.LocalDate wrDate) {
        if (wrDate == null) return null;
        java.time.LocalTime time;
        try {
            time = java.time.LocalTime.parse(editDeadlineTime);
        } catch (Exception e) {
            time = java.time.LocalTime.of(23, 59, 59);
        }
        int day = Math.max(1, Math.min(editDeadlineDayOfMonth, 28));
        return wrDate.plusMonths(1).withDayOfMonth(day).atTime(time);
    }

    private void assertEditable(java.time.LocalDate wrDate) {
        java.time.LocalDateTime deadline = resolveEditDeadline(wrDate);
        if (deadline != null && java.time.LocalDateTime.now().isAfter(deadline)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "기한이 지나 급여 담당자에게 직접 연락바랍니다");
        }
    }

    private void enrichEditMeta(WorkRecordResponseDto dto, java.time.LocalDate wrDate) {
        if (dto == null || wrDate == null) return;
        java.time.LocalDateTime until = resolveEditDeadline(wrDate);
        dto.setEditableUntil(until);
        dto.setIsEditable(until == null || !java.time.LocalDateTime.now().isAfter(until));
    }

    private String formatTotalWorkHours(LocalTime start, LocalTime end, LocalTime rest) {
        if (start == null || end == null) return "";
        long startMinutes = start.getHour() * 60L + start.getMinute();
        long endMinutes = end.getHour() * 60L + end.getMinute();
        if (endMinutes < startMinutes) endMinutes += 24 * 60;
        long restMinutes = rest != null ? rest.getHour() * 60L + rest.getMinute() : 0;
        long actual = Math.max(0, endMinutes - startMinutes - restMinutes);
        return String.format("%d:%02d", actual / 60, actual % 60);
    }

    private static final String ACTION_CREATE = "CREATE";
    private static final String ACTION_UPDATE = "UPDATE";
    private static final String ACTION_DELETE = "DELETE";
    private static final String ACTION_RESTORE = "RESTORE";

    private static final java.time.format.DateTimeFormatter HH_MM = java.time.format.DateTimeFormatter.ofPattern("HH:mm");

    private static long toMinutes(LocalTime t) {
        return t.getHour() * 60L + t.getMinute();
    }

    /** [start, end) in minutes from wrDate 00:00; end earlier than start = next-day checkout */
    private static long[] toInterval(LocalTime start, LocalTime end) {
        long s = toMinutes(start);
        long e = toMinutes(end);
        if (e < s) e += 24 * 60;
        return new long[]{s, e};
    }

    private static LocalTime truncateToMinutes(LocalTime t) {
        return t != null ? t.truncatedTo(java.time.temporal.ChronoUnit.MINUTES) : null;
    }

    private void validateWorkTimes(LocalTime start, LocalTime end, LocalTime rest) {
        if (start == null || end == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "출근 시간과 퇴근 시간을 입력해 주세요.");
        }
        if (toMinutes(start) == toMinutes(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "출근 시간과 퇴근 시간이 같습니다.");
        }
        long[] iv = toInterval(start, end);
        long restMinutes = rest != null ? toMinutes(rest) : 0;
        if (restMinutes >= iv[1] - iv[0]) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "휴게 시간은 근무 시간보다 짧아야 합니다.");
        }
    }

    private void assertNoOverlap(Long userIdx, LocalDate wrDate, LocalTime start, LocalTime end, Long excludeWrIdx) {
        long[] iv = toInterval(start, end);
        for (WorkRecord other : workRecordRepository.findByUser_UserIdxAndWrDate(userIdx, wrDate)) {
            if (excludeWrIdx != null && excludeWrIdx.equals(other.getWrIdx())) continue;
            if (other.getWrStartTime() == null || other.getWrEndTime() == null) continue;
            long[] o = toInterval(other.getWrStartTime(), other.getWrEndTime());
            if (iv[0] < o[1] && o[0] < iv[1]) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, String.format(
                        "이미 해당 날짜에 겹치는 근무 기록이 있습니다(%s~%s).",
                        other.getWrStartTime().format(HH_MM), other.getWrEndTime().format(HH_MM)));
            }
        }
    }

    /** Legacy rows have no action_type → infer from before/after */
    private static String resolveActionType(WorkRecordHistory h) {
        if (h.getActionType() != null) return h.getActionType();
        if (h.getAfterStartTime() == null) return ACTION_DELETE;
        if (h.getBeforeStartTime() == null) return ACTION_CREATE;
        return ACTION_UPDATE;
    }

    @Override
    @Transactional
    public WorkRecordResponseDto createWorkRecord(String requesterId, WorkRecordRequestDto requestDto) {
        User requester = getRequester(requesterId);

        if (requestDto.getWrDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "근무일을 입력해 주세요.");
        }

        User targetUser;
        if (isAdmin(requester)) {
            if (requestDto.getUserIdx() != null) {
                targetUser = userRepository.findById(requestDto.getUserIdx())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "대리 기록할 사용자를 찾을 수 없습니다."));
            } else {
                targetUser = requester;
            }
        } else {
            // 알바생은 무조건 본인 기록만 — 클라이언트가 보낸 userIdx는 무시
            targetUser = requester;
            assertEditable(requestDto.getWrDate());
        }

        com.recode.Dwaeji.user.database.WorkPlace workPlace;
        if (requestDto.getWorkPlaceIdx() != null) {
            workPlace = workPlaceRepository.findById(requestDto.getWorkPlaceIdx())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 근무지입니다."));
        } else {
            workPlace = targetUser.getWorkPlace(); // 기본값: 유저 소속 지점
        }

        LocalTime startTime = truncateToMinutes(requestDto.getWrStartTime());
        LocalTime endTime = truncateToMinutes(requestDto.getWrEndTime());
        LocalTime restTime = requestDto.getWrRestTime() != null
                ? truncateToMinutes(requestDto.getWrRestTime())
                : LocalTime.MIDNIGHT;
        validateWorkTimes(startTime, endTime, restTime);
        assertNoOverlap(targetUser.getUserIdx(), requestDto.getWrDate(), startTime, endTime, null);

        if (workPlace != null
                && workRecordRepository.existsByUser_UserIdxAndWrDateAndWorkPlace_WpIdx(
                        targetUser.getUserIdx(), requestDto.getWrDate(), workPlace.getWpIdx())) {
            boolean forSelf = requester.getUserIdx().equals(targetUser.getUserIdx());
            String msg = forSelf
                    ? "이 날짜·지점에 이미 근무 기록이 있습니다."
                    : "해당 직원은 이 날짜·지점에 이미 근무 기록이 있습니다.";
            throw new ResponseStatusException(HttpStatus.CONFLICT, msg);
        }

        WorkRecord workRecord = WorkRecord.builder()
                .user(targetUser)
                .workPlace(workPlace)
                .wrDate(requestDto.getWrDate())
                .wrStartTime(startTime)
                .wrEndTime(endTime)
                .wrRestTime(restTime)
                .wrRemarks(requestDto.getWrRemarks())
                .wrCreatedBy(requester.getUserIdx())
                .build();

        workRecordRepository.save(workRecord);

        if (isAdmin(requester)) {
            WorkRecordHistory history = WorkRecordHistory.builder()
                    .wrIdx(workRecord.getWrIdx())
                    .adminUser(requester)
                    .targetUser(targetUser)
                    .wrDate(workRecord.getWrDate())
                    .beforeStartTime(null)
                    .beforeEndTime(null)
                    .beforeRestTime(null)
                    .afterStartTime(workRecord.getWrStartTime())
                    .afterEndTime(workRecord.getWrEndTime())
                    .afterRestTime(workRecord.getWrRestTime())
                    .actionType(ACTION_CREATE)
                    .build();
            workRecordHistoryRepository.save(history);
        }

        return mapToDto(workRecord);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WorkRecordResponseDto> getAllWorkRecords(String requesterId, Long workPlaceIdx, String userName, Integer year, Integer month, int page, int size, String sortBy, String sortDir) {
        User requester = getRequester(requesterId);

        org.springframework.data.domain.Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? org.springframework.data.domain.Sort.Direction.ASC : org.springframework.data.domain.Sort.Direction.DESC;
        String sortProperty;
        switch (sortBy != null ? sortBy : "date") {
            case "userName": sortProperty = "user.userName"; break;
            case "workPlace": sortProperty = "workPlace.wpName"; break;
            case "date": sortProperty = "wrDate"; break;
            default: sortProperty = "wrDate"; break;
        }

        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(direction, sortProperty));
        Page<WorkRecord> records;

        if (year == null || month == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회할 연도(year)와 월(month)은 필수 파라미터입니다.");
        }

        java.time.YearMonth yearMonth = java.time.YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();


        if (isAdmin(requester)) {
            if (workPlaceIdx != null && userName != null && !userName.isEmpty()) {
                records = workRecordRepository.findByDateBetweenAndWorkPlaceAndUserNameFetch(startDate, endDate, workPlaceIdx, userName, pageable);
            } else if (workPlaceIdx != null) {
                records = workRecordRepository.findByDateBetweenAndWorkPlaceFetch(startDate, endDate, workPlaceIdx, pageable);
            } else if (userName != null && !userName.isEmpty()) {
                records = workRecordRepository.findByDateBetweenAndUserNameFetch(startDate, endDate, userName, pageable);
            } else {
                records = workRecordRepository.findByDateBetweenFetch(startDate, endDate, pageable);
            }
        } else {
            records = workRecordRepository.findByUserIdxFetch(requester.getUserIdx(), pageable);
        }

        // 배치로 Schedule/Apply 한 번에 조회 (N+1 방지)
        List<Long> userIdxList = records.getContent().stream()
                .map(r -> r.getUser().getUserIdx()).distinct().collect(Collectors.toList());
        Set<LocalDate> dateSet = records.getContent().stream()
                .map(WorkRecord::getWrDate)
                .collect(java.util.stream.Collectors.toSet());

        Map<String, WorkScheduleDaily> scheduleMap = new HashMap<>();
        Map<String, WorkApplyDaily> applyMap = new HashMap<>();
        if (!userIdxList.isEmpty() && !dateSet.isEmpty()) {
            dateSet.forEach(date -> {
                workScheduleDailyRepository.findByUser_UserIdxInAndWsdDate(userIdxList, date)
                        .forEach(s -> scheduleMap.put(s.getUser().getUserIdx() + "-" + date, s));
                workApplyDailyRepository.findByUser_UserIdxInAndWadDate(userIdxList, date)
                        .forEach(a -> applyMap.put(a.getUser().getUserIdx() + "-" + date, a));
            });
        }

        return records.map(record -> {
            LocalDate wrDate = record.getWrDate();
            if (wrDate == null || record.getUser() == null) {
                WorkRecordResponseDto dto = WorkRecordResponseDto.fromEntity(record, null);
                enrichEditMeta(dto, wrDate);
                return dto;
            }
            WorkScheduleDaily schedule = scheduleMap.get(record.getUser().getUserIdx() + "-" + wrDate);
            WorkApplyDaily apply = applyMap.get(record.getUser().getUserIdx() + "-" + wrDate);
            String applyStatus = resolveApplyStatus(schedule, apply);
            WorkRecordResponseDto dto = WorkRecordResponseDto.fromEntity(record, applyStatus);
            enrichEditMeta(dto, wrDate);
            Long seq = userRepository.findNameSeqByUserIdx(record.getUser().getUserIdx());
            dto.setNameSeq(seq != null ? seq : 1L);
            return dto;
        });
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkRecordResponseDto> getMonthlyWorkRecords(String requesterId, LocalDate startDate, LocalDate endDate) {
        User requester = getRequester(requesterId);
        
        List<WorkRecord> records = workRecordRepository.findByUserIdxAndDateBetweenFetch(requester.getUserIdx(), startDate, endDate);
        
        List<Long> userIdxList = records.stream().map(r -> r.getUser().getUserIdx()).distinct().collect(Collectors.toList());
        Set<LocalDate> dateSet = records.stream().map(WorkRecord::getWrDate).collect(java.util.stream.Collectors.toSet());

        Map<String, WorkScheduleDaily> scheduleMap = new HashMap<>();
        Map<String, WorkApplyDaily> applyMap = new HashMap<>();
        if (!userIdxList.isEmpty() && !dateSet.isEmpty()) {
            dateSet.forEach(date -> {
                workScheduleDailyRepository.findByUser_UserIdxInAndWsdDate(userIdxList, date)
                        .forEach(s -> scheduleMap.put(s.getUser().getUserIdx() + "-" + date, s));
                workApplyDailyRepository.findByUser_UserIdxInAndWadDate(userIdxList, date)
                        .forEach(a -> applyMap.put(a.getUser().getUserIdx() + "-" + date, a));
            });
        }

        return records.stream().map(record -> {
            LocalDate wrDate = record.getWrDate();
            if (wrDate == null || record.getUser() == null) {
                WorkRecordResponseDto dto = WorkRecordResponseDto.fromEntity(record, null);
                enrichEditMeta(dto, wrDate);
                return dto;
            }
            WorkScheduleDaily schedule = scheduleMap.get(record.getUser().getUserIdx() + "-" + wrDate);
            WorkApplyDaily apply = applyMap.get(record.getUser().getUserIdx() + "-" + wrDate);
            String applyStatus = resolveApplyStatus(schedule, apply);
            WorkRecordResponseDto dto = WorkRecordResponseDto.fromEntity(record, applyStatus);
            enrichEditMeta(dto, wrDate);
            Long seq = userRepository.findNameSeqByUserIdx(record.getUser().getUserIdx());
            dto.setNameSeq(seq != null ? seq : 1L);
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public WorkRecordResponseDto getWorkRecordById(String requesterId, Long wrIdx) {
        User requester = getRequester(requesterId);
        WorkRecord record = workRecordRepository.findById(wrIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "근무 기록을 찾을 수 없습니다."));

        if (!isAdmin(requester) && !record.getUser().getUserIdx().equals(requester.getUserIdx())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 기록만 조회할 수 있습니다.");
        }

        return mapToDto(record);
    }

    @Override
    @Transactional
    public void updateWorkRecord(String requesterId, Long wrIdx, WorkRecordRequestDto requestDto) {
        User requester = getRequester(requesterId);
        WorkRecord record = workRecordRepository.findById(wrIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 근무 기록을 찾을 수 없습니다."));

        if (!isAdmin(requester) && !record.getUser().getUserIdx().equals(requester.getUserIdx())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 기록만 수정할 수 있습니다.");
        }

        if (!isAdmin(requester)) {
            assertEditable(record.getWrDate());
        }

        LocalDate newDate = requestDto.getWrDate() != null ? requestDto.getWrDate() : record.getWrDate();
        com.recode.Dwaeji.user.database.WorkPlace newWp = record.getWorkPlace();
        if (requestDto.getWorkPlaceIdx() != null) {
            com.recode.Dwaeji.user.database.WorkPlace resolved = workPlaceRepository.findById(requestDto.getWorkPlaceIdx()).orElse(null);
            if (resolved != null) {
                newWp = resolved;
            }
        }
        Long newWpIdx = newWp != null ? newWp.getWpIdx() : null;
        Long oldWpIdx = record.getWorkPlace() != null ? record.getWorkPlace().getWpIdx() : null;
        boolean keyChanged = (requestDto.getWrDate() != null && !requestDto.getWrDate().equals(record.getWrDate()))
                || (newWpIdx != null && !newWpIdx.equals(oldWpIdx));

        if (keyChanged && newWpIdx != null
                && workRecordRepository.existsByUser_UserIdxAndWrDateAndWorkPlace_WpIdxAndWrIdxNot(
                        record.getUser().getUserIdx(), newDate, newWpIdx, record.getWrIdx())) {
            boolean forSelf = requester.getUserIdx().equals(record.getUser().getUserIdx());
            String msg = forSelf
                    ? "이 날짜·지점에 이미 근무 기록이 있습니다."
                    : "해당 직원은 이 날짜·지점에 이미 근무 기록이 있습니다.";
            throw new ResponseStatusException(HttpStatus.CONFLICT, msg);
        }

        LocalTime reqStart = truncateToMinutes(requestDto.getWrStartTime());
        LocalTime reqEnd = truncateToMinutes(requestDto.getWrEndTime());
        LocalTime reqRest = truncateToMinutes(requestDto.getWrRestTime());
        LocalTime newStart = reqStart != null ? reqStart : record.getWrStartTime();
        LocalTime newEnd = reqEnd != null ? reqEnd : record.getWrEndTime();
        LocalTime newRest = reqRest != null ? reqRest : record.getWrRestTime();
        boolean dateChanged = !newDate.equals(record.getWrDate());
        boolean timeInputChanged = !Objects.equals(newStart, record.getWrStartTime())
                || !Objects.equals(newEnd, record.getWrEndTime())
                || !Objects.equals(newRest, record.getWrRestTime());
        if (dateChanged || timeInputChanged) {
            validateWorkTimes(newStart, newEnd, newRest);
            assertNoOverlap(record.getUser().getUserIdx(), newDate, newStart, newEnd, record.getWrIdx());
        }

        if (dateChanged) {
            record.setWrDate(newDate);
        }

        boolean isTimeChanged = false;
        LocalTime beforeStartTime = record.getWrStartTime();
        LocalTime beforeEndTime = record.getWrEndTime();
        LocalTime beforeRestTime = record.getWrRestTime();

        if (reqStart != null && !reqStart.equals(record.getWrStartTime())) {
            record.setWrStartTime(reqStart);
            isTimeChanged = true;
        }
        if (reqEnd != null && !reqEnd.equals(record.getWrEndTime())) {
            record.setWrEndTime(reqEnd);
            isTimeChanged = true;
        }
        if (reqRest != null && !reqRest.equals(record.getWrRestTime())) {
            record.setWrRestTime(reqRest);
            isTimeChanged = true;
        }
        if (requestDto.getWrRemarks() != null) {
            record.setWrRemarks(requestDto.getWrRemarks());
        }
        if (newWp != null && (oldWpIdx == null || !newWp.getWpIdx().equals(oldWpIdx))) {
            record.setWorkPlace(newWp);
        }

        workRecordRepository.save(record);

        // 관리자가 시간을 수정한 경우 Audit Log 남기기
        if (isAdmin(requester) && isTimeChanged) {
            WorkRecordHistory history = WorkRecordHistory.builder()
                    .wrIdx(record.getWrIdx())
                    .adminUser(requester)
                    .targetUser(record.getUser())
                    .wrDate(record.getWrDate())
                    .beforeStartTime(beforeStartTime)
                    .beforeEndTime(beforeEndTime)
                    .beforeRestTime(beforeRestTime)
                    .afterStartTime(record.getWrStartTime())
                    .afterEndTime(record.getWrEndTime())
                    .afterRestTime(record.getWrRestTime())
                    .actionType(ACTION_UPDATE)
                    .build();
            workRecordHistoryRepository.save(history);
        }
    }

    @Override
    @Transactional
    public void deleteWorkRecord(String requesterId, Long wrIdx) {
        User requester = getRequester(requesterId);
        
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "근무 기록은 관리자만 삭제할 수 있습니다.");
        }

        WorkRecord record = workRecordRepository.findById(wrIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 근무 기록을 찾을 수 없습니다."));

        if (isAdmin(requester)) {
            WorkRecordHistory history = WorkRecordHistory.builder()
                    .wrIdx(record.getWrIdx())
                    .adminUser(requester)
                    .targetUser(record.getUser())
                    .wrDate(record.getWrDate())
                    .beforeStartTime(record.getWrStartTime())
                    .beforeEndTime(record.getWrEndTime())
                    .beforeRestTime(record.getWrRestTime())
                    .afterStartTime(null)
                    .afterEndTime(null)
                    .afterRestTime(null)
                    .actionType(ACTION_DELETE)
                    .build();
            workRecordHistoryRepository.save(history);
        }

        workRecordRepository.delete(record);
    }

    @Override
    @Transactional
    public void restoreWorkRecord(String requesterId, Long wrhIdx) {
        User requester = getRequester(requesterId);

        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 근무 기록을 복구할 수 있습니다.");
        }

        WorkRecordHistory history = workRecordHistoryRepository.findById(wrhIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "수정 이력을 찾을 수 없습니다."));

        if (!ACTION_DELETE.equals(resolveActionType(history))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 이력은 삭제 기록이 아닙니다.");
        }

        com.recode.Dwaeji.user.database.WorkPlace restoreWp = history.getTargetUser().getWorkPlace();
        if (restoreWp != null
                && workRecordRepository.existsByUser_UserIdxAndWrDateAndWorkPlace_WpIdx(
                        history.getTargetUser().getUserIdx(), history.getWrDate(), restoreWp.getWpIdx())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "해당 직원은 이 날짜·지점에 이미 근무 기록이 있어 복구할 수 없습니다.");
        }
        if (history.getBeforeStartTime() != null && history.getBeforeEndTime() != null) {
            assertNoOverlap(history.getTargetUser().getUserIdx(), history.getWrDate(),
                    history.getBeforeStartTime(), history.getBeforeEndTime(), null);
        }

        WorkRecord restoredRecord = WorkRecord.builder()
                .user(history.getTargetUser())
                .workPlace(restoreWp)
                .wrDate(history.getWrDate())
                .wrStartTime(history.getBeforeStartTime())
                .wrEndTime(history.getBeforeEndTime())
                .wrRestTime(history.getBeforeRestTime())
                .wrRemarks("삭제된 기록 복구됨")
                .wrCreatedBy(requester.getUserIdx())
                .build();

        workRecordRepository.save(restoredRecord);

        // 복구 이력 저장
        WorkRecordHistory newHistory = WorkRecordHistory.builder()
                .wrIdx(restoredRecord.getWrIdx())
                .adminUser(requester)
                .targetUser(restoredRecord.getUser())
                .wrDate(restoredRecord.getWrDate())
                .beforeStartTime(null)
                .beforeEndTime(null)
                .beforeRestTime(null)
                .afterStartTime(restoredRecord.getWrStartTime())
                .afterEndTime(restoredRecord.getWrEndTime())
                .afterRestTime(restoredRecord.getWrRestTime())
                .actionType(ACTION_RESTORE)
                .build();

        workRecordHistoryRepository.save(newHistory);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WorkRecordHistoryResponseDto> getWorkRecordHistory(String requesterId, Integer year, Integer month, String keyword, org.springframework.data.domain.Pageable pageable) {
        User requester = getRequester(requesterId);
        
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 수정 이력을 조회할 수 있습니다.");
        }

        org.springframework.data.domain.Page<WorkRecordHistory> historyPage = workRecordHistoryRepository.searchHistory(year, month, keyword, pageable);

        // 기록 당시 근무지 우선, 기록이 삭제됐으면 대상자 소속 지점
        List<Long> wrIdxList = historyPage.getContent().stream()
                .map(WorkRecordHistory::getWrIdx).filter(Objects::nonNull).distinct().collect(Collectors.toList());
        Map<Long, String> recordWpNameByWrIdx = new HashMap<>();
        for (WorkRecord r : workRecordRepository.findAllById(wrIdxList)) {
            if (r.getWorkPlace() != null) {
                recordWpNameByWrIdx.put(r.getWrIdx(), r.getWorkPlace().getWpName());
            }
        }

        return historyPage.map(h -> WorkRecordHistoryResponseDto.builder()
                .wrhIdx(h.getWrhIdx())
                .wrIdx(h.getWrIdx())
                .adminName(h.getAdminUser().getUserName())
                .targetUserName(h.getTargetUser().getUserName())
                .workPlaceName(recordWpNameByWrIdx.getOrDefault(h.getWrIdx(),
                        h.getTargetUser().getWorkPlace() != null ? h.getTargetUser().getWorkPlace().getWpName() : null))
                .wrDate(h.getWrDate())
                .beforeStartTime(h.getBeforeStartTime())
                .beforeEndTime(h.getBeforeEndTime())
                .beforeRestTime(h.getBeforeRestTime())
                .afterStartTime(h.getAfterStartTime())
                .afterEndTime(h.getAfterEndTime())
                .afterRestTime(h.getAfterRestTime())
                .actionType(resolveActionType(h))
                .wrhCreatedAt(h.getWrhCreatedAt())
                .build());
    }

    private String resolveApplyStatus(WorkScheduleDaily schedule, WorkApplyDaily apply) {
        if (schedule != null && Boolean.TRUE.equals(schedule.getWsdIsConfirmed())
                && schedule.getWsdStatus() == ApplyStatus.출근) {
            return ApplyStatus.출근.name();
        }
        if (schedule != null && schedule.getWsdStatus() == ApplyStatus.미출근) {
            return ApplyStatus.미출근.name();
        }
        if (apply != null) {
            return ApplyStatus.신청.name();
        }
        return null;
    }

    private WorkRecordResponseDto mapToDto(WorkRecord record) {
        java.time.LocalDate wrDate = record.getWrDate();
        if (wrDate == null || record.getUser() == null) {
            WorkRecordResponseDto dto = WorkRecordResponseDto.fromEntity(record, null);
            enrichEditMeta(dto, wrDate);
            return dto;
        }
        
        WorkScheduleDaily schedule = workScheduleDailyRepository
                .findByUser_UserIdxAndWsdDate(record.getUser().getUserIdx(), wrDate)
                .orElse(null);

        WorkApplyDaily apply = workApplyDailyRepository
                .findByUser_UserIdxAndWadDate(record.getUser().getUserIdx(), wrDate)
                .orElse(null);

        String applyStatus = resolveApplyStatus(schedule, apply);
        WorkRecordResponseDto dto = WorkRecordResponseDto.fromEntity(record, applyStatus);
        enrichEditMeta(dto, wrDate);
        if (record.getUser() != null && record.getUser().getUserIdx() != null) {
            Long seq = userRepository.findNameSeqByUserIdx(record.getUser().getUserIdx());
            dto.setNameSeq(seq != null ? seq : 1L);
        }
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] downloadExcel(String requesterId, int year, int month, Long workPlaceIdx) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        Integer canExportExcel = requester.getUserType().getUtCanExportExcel();
        if (canExportExcel == null || canExportExcel != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "엑셀 다운로드 권한이 없습니다.");
        }

        java.time.LocalDate startDate = java.time.LocalDate.of(year, month, 1);
        java.time.LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        List<WorkRecord> records;
        if (workPlaceIdx != null) {
            // 기록에 저장된 근무지 기준 (소속 지점이 아닌 실제 근무 지점)
            records = workRecordRepository.findByWorkPlace_WpIdxAndWrDateBetween(workPlaceIdx, startDate, endDate);
        } else {
            records = workRecordRepository.findByWrDateBetween(startDate, endDate);
        }

        // 전체: 근무지별 Sheet / 특정 지점: Sheet 1개 (그룹 키는 wpIdx, Sheet 순서는 wpIdx 오름차순)
        Map<Long, List<WorkRecord>> byWpIdx = new TreeMap<>(Comparator.nullsLast(Long::compareTo));
        if (workPlaceIdx != null) {
            byWpIdx.put(workPlaceIdx, records);
        } else {
            for (WorkRecord record : records) {
                Long key = record.getWorkPlace() != null ? record.getWorkPlace().getWpIdx() : null;
                byWpIdx.computeIfAbsent(key, k -> new ArrayList<>()).add(record);
            }
            if (byWpIdx.isEmpty()) {
                byWpIdx.put(null, List.of());
            }
        }

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            String[] headers = {"No", "날짜", "이름", "근무지", "출근 시간", "퇴근 시간", "휴게 시간", "총근무시간"};
            var dark = com.recode.Dwaeji.common.excel.ExcelDarkTheme.create(workbook);
            Set<String> usedSheetNames = new HashSet<>();
            // 동명이인: 동일 실명 활성 인원 수 (시트 공통)
            Map<Long, Long> nameCountByUserIdx = new HashMap<>();
            for (List<WorkRecord> group : byWpIdx.values()) {
                for (WorkRecord r : group) {
                    if (r.getUser() == null || r.getUser().getUserIdx() == null) continue;
                    nameCountByUserIdx.computeIfAbsent(r.getUser().getUserIdx(), id -> {
                        Long c = userRepository.findNameSeqByUserIdx(id);
                        return c != null ? c : 1L;
                    });
                }
            }
            for (Map.Entry<Long, List<WorkRecord>> entry : byWpIdx.entrySet()) {
                List<WorkRecord> sheetRecords = entry.getValue().stream()
                        .sorted(Comparator
                                .comparing(WorkRecord::getWrDate, Comparator.nullsLast(Comparator.reverseOrder()))
                                .thenComparing(r -> r.getUser() != null ? r.getUser().getUserName() : null,
                                        Comparator.nullsLast(String::compareTo))
                                .thenComparing(WorkRecord::getWrStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
                        .collect(Collectors.toList());
                String baseName = resolveSheetName(entry.getKey(), sheetRecords, month, workPlaceIdx);
                String sheetName = uniqueExcelSheetName(toExcelSheetName(baseName), usedSheetNames);
                writeWorkRecordSheet(workbook.createSheet(sheetName), headers, sheetRecords, dark, nameCountByUserIdx);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "엑셀 파일 생성 중 오류가 발생했습니다.");
        }
    }

    private String resolveSheetName(Long wpIdx, List<WorkRecord> sheetRecords, int month, Long filterWpIdx) {
        String fromRecord = sheetRecords.stream()
                .map(r -> r.getWorkPlace() != null ? r.getWorkPlace().getWpName() : null)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        if (fromRecord != null) return fromRecord;
        if (wpIdx != null) {
            return workPlaceRepository.findById(wpIdx)
                    .map(wp -> wp.getWpName() != null ? wp.getWpName() : "근무지")
                    .orElse("근무지");
        }
        if (filterWpIdx == null && sheetRecords.isEmpty()) {
            return month + "월 근무기록";
        }
        return "미소속";
    }

    private static String toExcelSheetName(String name) {
        if (name == null || name.isBlank()) return "미소속";
        // Excel sheet: max 31, 금지 문자 \ / ? * [ ]
        String cleaned = name.replaceAll("[\\\\/?*\\[\\]]", " ").trim();
        if (cleaned.isEmpty()) cleaned = "미소속";
        return cleaned.length() > 31 ? cleaned.substring(0, 31) : cleaned;
    }

    private static String uniqueExcelSheetName(String base, Set<String> used) {
        String candidate = base;
        int n = 2;
        while (!used.add(candidate)) {
            String suffix = " (" + n + ")";
            int maxBase = Math.max(1, 31 - suffix.length());
            candidate = (base.length() > maxBase ? base.substring(0, maxBase) : base) + suffix;
            n++;
        }
        return candidate;
    }

    /** 기록 근무지 ≠ 유저 소속 지점이면 타지점 */
    private static boolean isOtherBranchWorker(WorkRecord record) {
        if (record.getUser() == null || record.getUser().getWorkPlace() == null || record.getWorkPlace() == null) {
            return false;
        }
        Long homeWpIdx = record.getUser().getWorkPlace().getWpIdx();
        Long recordWpIdx = record.getWorkPlace().getWpIdx();
        return homeWpIdx != null && recordWpIdx != null && !homeWpIdx.equals(recordWpIdx);
    }

    private void writeWorkRecordSheet(
            org.apache.poi.ss.usermodel.Sheet sheet,
            String[] headers,
            List<WorkRecord> records,
            com.recode.Dwaeji.common.excel.ExcelDarkTheme.Styles dark,
            Map<Long, Long> nameCountByUserIdx) {
        org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);
        }

        int rowNum = 1;
        for (WorkRecord record : records) {
            User user = record.getUser();
            org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum++);
            String date = record.getWrDate() != null ? record.getWrDate().toString() : "";
            String userName = user != null && user.getUserName() != null ? user.getUserName() : "";
            Long userIdx = user != null ? user.getUserIdx() : null;
            Long nameCount = userIdx != null ? nameCountByUserIdx.getOrDefault(userIdx, 1L) : 1L;
            if (nameCount > 1 && userIdx != null) {
                userName = userName.isEmpty() ? "#" + userIdx : userName + " #" + userIdx;
            }
            if (isOtherBranchWorker(record)) {
                userName = userName.isEmpty() ? "타지점" : userName + " (타지점)";
            }
            String wpName = record.getWorkPlace() != null && record.getWorkPlace().getWpName() != null
                    ? record.getWorkPlace().getWpName()
                    : "";
            String startTime = record.getWrStartTime() != null ? record.getWrStartTime().toString() : "";
            String endTime = record.getWrEndTime() != null ? record.getWrEndTime().toString() : "";
            String restTimeStr = record.getWrRestTime() != null ? record.getWrRestTime().toString() : "00:00";
            String totalHours = formatTotalWorkHours(record.getWrStartTime(), record.getWrEndTime(), record.getWrRestTime());
            row.createCell(0).setCellValue(rowNum - 1);
            row.createCell(1).setCellValue(date);
            row.createCell(2).setCellValue(userName);
            row.createCell(3).setCellValue(wpName);
            row.createCell(4).setCellValue(startTime);
            row.createCell(5).setCellValue(endTime);
            row.createCell(6).setCellValue(restTimeStr);
            row.createCell(7).setCellValue(totalHours);
        }
        if (rowNum > 1) {
            sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, rowNum - 1, 0, headers.length - 1));
        }
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
            int currentWidth = sheet.getColumnWidth(i);
            sheet.setColumnWidth(i, (int) (currentWidth * 1.3));
        }
        com.recode.Dwaeji.common.excel.ExcelDarkTheme.apply(sheet, dark, Math.max(rowNum - 1, 0), headers.length);
    }

    @Override
    @Transactional(readOnly = true)
    public com.recode.Dwaeji.work_record.dto.ExcelValidateResponseDto validateExcelUsers(
            String requesterId, com.recode.Dwaeji.work_record.dto.ExcelValidateRequestDto requestDto) {
        User requester = getRequester(requesterId);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 엑셀 검증을 수행할 수 있습니다.");
        }

        List<String> duplicateNames = new ArrayList<>();
        List<String> invalidWorkPlaces = new ArrayList<>();
        List<com.recode.Dwaeji.work_record.dto.ExcelValidateResponseDto.ExistingUserDto> existingUsers = new ArrayList<>();
        List<String> newUsers = new ArrayList<>();

        // 1. 시트명(근무지명) 검증: 활성 여부(wp_is_active) 조건 없이 전체 근무지 테이블에서 조회
        if (requestDto.getWorkPlaceNames() != null) {
            List<com.recode.Dwaeji.user.database.WorkPlace> allWorkPlaces = workPlaceRepository.findAll();
            Set<String> existingWpNames = allWorkPlaces.stream()
                    .map(w -> w.getWpName() != null ? w.getWpName().trim() : "")
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toSet());

            for (String sheetWpName : requestDto.getWorkPlaceNames()) {
                if (sheetWpName != null && !sheetWpName.trim().isEmpty()) {
                    String trimmed = sheetWpName.trim();
                    if (!existingWpNames.contains(trimmed)) {
                        invalidWorkPlaces.add(trimmed);
                    }
                }
            }
        }

        // 2. 유저명 사전 검증
        if (requestDto.getUserNames() != null) {
            Set<String> distinctNames = requestDto.getUserNames().stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toCollection(java.util.LinkedHashSet::new));

            for (String name : distinctNames) {
                List<User> matched = userRepository.findActiveNamedUsers(name);
                if (matched.size() > 1) {
                    duplicateNames.add(name);
                } else if (matched.size() == 1) {
                    User u = matched.get(0);
                    String wpName = u.getWorkPlace() != null ? u.getWorkPlace().getWpName() : null;
                    existingUsers.add(new com.recode.Dwaeji.work_record.dto.ExcelValidateResponseDto.ExistingUserDto(
                            u.getUserName(), u.getUserIdx(), wpName));
                } else {
                    newUsers.add(name);
                }
            }
        }

        // 3. 중복 근무기록(기존 기록) 사전 점검 (records가 전달된 경우)
        List<com.recode.Dwaeji.work_record.dto.ExcelValidateResponseDto.DuplicateRecordDto> existingRecords = new ArrayList<>();
        if (requestDto.getRecords() != null && !requestDto.getRecords().isEmpty()) {
            List<com.recode.Dwaeji.user.database.WorkPlace> allWorkPlaces = workPlaceRepository.findAll();
            Map<String, com.recode.Dwaeji.user.database.WorkPlace> wpByName = allWorkPlaces.stream()
                    .filter(w -> w.getWpName() != null)
                    .collect(Collectors.toMap(w -> w.getWpName().trim(), w -> w, (k1, k2) -> k1));

            for (com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadRequestDto.ExcelRecordItemDto item : requestDto.getRecords()) {
                String name = item.getUserName() != null ? item.getUserName().trim() : "";
                if (name.isEmpty() || duplicateNames.contains(name)) {
                    continue;
                }

                List<User> matched = userRepository.findActiveNamedUsers(name);
                if (matched.size() != 1) {
                    continue; // 기존에 정확히 1명 매칭되는 유저에 대해서만 기존 DB 기록 체크
                }
                User user = matched.get(0);

                LocalDate wrDate;
                try {
                    wrDate = LocalDate.parse(item.getWorkDate().trim());
                } catch (Exception e) {
                    continue;
                }

                // 근무지 찾기
                com.recode.Dwaeji.user.database.WorkPlace recordWp = null;
                if (item.getWorkPlaceName() != null && !item.getWorkPlaceName().trim().isEmpty()) {
                    recordWp = wpByName.get(item.getWorkPlaceName().trim());
                }
                if (recordWp == null) {
                    recordWp = user.getWorkPlace();
                }

                if (recordWp != null) {
                    java.util.Optional<WorkRecord> existingOpt =
                            workRecordRepository.findByUser_UserIdxAndWrDateAndWorkPlace_WpIdx(user.getUserIdx(), wrDate, recordWp.getWpIdx());

                    if (existingOpt.isPresent()) {
                        WorkRecord ex = existingOpt.get();
                        existingRecords.add(com.recode.Dwaeji.work_record.dto.ExcelValidateResponseDto.DuplicateRecordDto.builder()
                                .workDate(wrDate.toString())
                                .userName(user.getUserName())
                                .workPlaceName(recordWp.getWpName())
                                .currentStartTime(ex.getWrStartTime() != null ? ex.getWrStartTime().toString() : "")
                                .currentEndTime(ex.getWrEndTime() != null ? ex.getWrEndTime().toString() : "")
                                .currentBreakTime(ex.getWrRestTime() != null ? ex.getWrRestTime().toString() : "")
                                .excelStartTime(item.getStartTime())
                                .excelEndTime(item.getEndTime())
                                .excelBreakTime(item.getBreakTime())
                                .build());
                    }
                }
            }
        }

        return com.recode.Dwaeji.work_record.dto.ExcelValidateResponseDto.builder()
                .duplicateNames(duplicateNames)
                .invalidWorkPlaces(invalidWorkPlaces)
                .existingUsers(existingUsers)
                .newUsers(newUsers)
                .existingRecords(existingRecords)
                .build();
    }

    @Override
    @Transactional
    public com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadResponseDto uploadWorkRecordsFromExcel(
            String requesterId, com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadRequestDto requestDto) {
        User requester = getRequester(requesterId);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 엑셀 근무기록을 일괄 등록할 수 있습니다.");
        }

        if (requestDto.getRecords() == null || requestDto.getRecords().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "등록할 근무 기록이 없습니다.");
        }

        // 0. 전체 근무지 맵 구성 (active 조건 없이 전체 조회: 시트명 매칭용)
        List<com.recode.Dwaeji.user.database.WorkPlace> allWorkPlaces = workPlaceRepository.findAll();
        Map<String, com.recode.Dwaeji.user.database.WorkPlace> wpByName = allWorkPlaces.stream()
                .filter(w -> w.getWpName() != null)
                .collect(Collectors.toMap(w -> w.getWpName().trim(), w -> w, (k1, k2) -> k1));

        // 1. 유저명별 지점 매핑 맵 구성
        Map<String, Long> userWpMap = new HashMap<>();
        if (requestDto.getUserWorkPlaces() != null) {
            for (com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadRequestDto.UserWorkPlaceMappingDto m : requestDto.getUserWorkPlaces()) {
                if (m.getUserName() != null && !m.getUserName().trim().isEmpty() && m.getWorkPlaceIdx() != null) {
                    userWpMap.put(m.getUserName().trim(), m.getWorkPlaceIdx());
                }
            }
        }

        // 2. 레코드에 등장하는 시트명(근무지명) 검증
        for (com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadRequestDto.ExcelRecordItemDto item : requestDto.getRecords()) {
            if (item.getWorkPlaceName() != null && !item.getWorkPlaceName().trim().isEmpty()) {
                String wpName = item.getWorkPlaceName().trim();
                if (!wpByName.containsKey(wpName)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "등록되지 않은 근무지 시트가 포함되어 있습니다: [" + wpName + "]");
                }
            }
        }

        // 3. 엑셀에 등장하는 모든 유저명 수집
        Set<String> names = requestDto.getRecords().stream()
                .map(r -> r.getUserName() != null ? r.getUserName().trim() : "")
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());

        // 4. 동명이인 사전 검사 & 기존 유저 / 신규 유저 분류 및 인원 카운팅
        Map<String, User> resolvedUsers = new HashMap<>();
        int existingUsersCount = 0;
        int newUsersCount = 0;

        for (String name : names) {
            List<User> matched = userRepository.findActiveNamedUsers(name);
            if (matched.size() > 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "동일한 이름의 사용자가 여러 명 존재합니다. 엑셀 업로드 전 기존 사용자의 이름을 변경해 주세요. (대상자: " + name + ")");
            } else if (matched.size() == 1) {
                resolvedUsers.put(name, matched.get(0));
                existingUsersCount++;
            } else {
                com.recode.Dwaeji.user.database.WorkPlace targetWorkPlace = null;
                Long explicitWpIdx = userWpMap.get(name);
                if (explicitWpIdx != null) {
                    targetWorkPlace = workPlaceRepository.findById(explicitWpIdx)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 근무지입니다: " + explicitWpIdx));
                } else {
                    String userSheetWp = requestDto.getRecords().stream()
                            .filter(r -> name.equals(r.getUserName() != null ? r.getUserName().trim() : ""))
                            .map(com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadRequestDto.ExcelRecordItemDto::getWorkPlaceName)
                            .filter(Objects::nonNull)
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .findFirst()
                            .orElse(null);
                    if (userSheetWp != null && wpByName.containsKey(userSheetWp)) {
                        targetWorkPlace = wpByName.get(userSheetWp);
                    } else if (requestDto.getWorkPlaceIdx() != null) {
                        targetWorkPlace = workPlaceRepository.findById(requestDto.getWorkPlaceIdx())
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 근무지입니다: " + requestDto.getWorkPlaceIdx()));
                    }
                }

                if (targetWorkPlace == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + "의 소속 근무지 정보를 확인할 수 없습니다.");
                }

                com.recode.Dwaeji.user.database.UserType albaType = userTypeRepository.findById(5L)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "기본 알바생 직급(5)을 찾을 수 없습니다."));

                String initialTempId = "temp_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
                String initialPhone = "000-000-" + String.format("%04d", (int) (Math.random() * 10000));

                User tempUser = User.builder()
                        .userId(initialTempId)
                        .userPw(passwordEncoder.encode("123456"))
                        .userName(name)
                        .userPhone(initialPhone)
                        .userBirth(LocalDate.of(1901, 1, 1))
                        .userType(albaType)
                        .workPlace(targetWorkPlace)
                        .userIsActive(1)
                        .isTempUser(1)
                        .bankConsentAgreed(true)
                        .emailConsentAgreed(false)
                        .build();

                tempUser = userRepository.saveAndFlush(tempUser);

                Long idx = tempUser.getUserIdx();
                tempUser.setUserId("temp_" + idx);
                tempUser.setUserPhone("000-000-" + String.format("%04d", idx));
                tempUser = userRepository.save(tempUser);

                resolvedUsers.put(name, tempUser);
                newUsersCount++;
            }
        }

        // 5. 레코드 유효성 검사 및 저장 (덮어쓰기 옵션 지원)
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("H:mm");
        DateTimeFormatter timeFmtHh = DateTimeFormatter.ofPattern("HH:mm");
        Map<String, Integer> userRecordCounts = new LinkedHashMap<>();
        Map<String, Integer> workPlaceRecordCounts = new LinkedHashMap<>();
        int insertedRecordsCount = 0;
        int updatedRecordsCount = 0;
        int skippedRecordsCount = 0;
        boolean shouldOverwrite = Boolean.TRUE.equals(requestDto.getOverwriteExisting());

        for (com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadRequestDto.ExcelRecordItemDto item : requestDto.getRecords()) {
            String name = item.getUserName() != null ? item.getUserName().trim() : "";
            User user = resolvedUsers.get(name);
            if (user == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사용자를 찾을 수 없습니다: " + name);
            }

            LocalDate wrDate;
            try {
                wrDate = LocalDate.parse(item.getWorkDate().trim());
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "근무일 날짜 형식(YYYY-MM-DD) 오류: " + item.getWorkDate());
            }

            LocalTime startTime = parseTimeString(item.getStartTime(), timeFmt, timeFmtHh, "출근 시각");
            LocalTime endTime = parseTimeString(item.getEndTime(), timeFmt, timeFmtHh, "퇴근 시각");
            LocalTime restTime = parseTimeString(item.getBreakTime(), timeFmt, timeFmtHh, "휴게 시간");
            if (restTime == null) {
                restTime = LocalTime.of(0, 0);
            }

            // 근무 시간 논리 검증 (출퇴근 시간 동일 또는 휴게시간 과다 시 에러, 익일 퇴근은 허용)
            validateWorkTimes(startTime, endTime, restTime);

            // 근무지 결정: 시트명(workPlaceName) -> 유저 소속 지점 -> 기본 지점
            com.recode.Dwaeji.user.database.WorkPlace recordWp = null;
            if (item.getWorkPlaceName() != null && !item.getWorkPlaceName().trim().isEmpty()) {
                recordWp = wpByName.get(item.getWorkPlaceName().trim());
            }
            if (recordWp == null) {
                recordWp = user.getWorkPlace();
            }
            if (recordWp == null && requestDto.getWorkPlaceIdx() != null) {
                recordWp = workPlaceRepository.findById(requestDto.getWorkPlaceIdx()).orElse(null);
            }
            if (recordWp == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + "의 근무지 정보를 확인할 수 없습니다.");
            }

            String wpLabel = recordWp.getWpName();

            java.util.Optional<WorkRecord> existingOpt =
                    workRecordRepository.findByUser_UserIdxAndWrDateAndWorkPlace_WpIdx(user.getUserIdx(), wrDate, recordWp.getWpIdx());

            if (existingOpt.isPresent()) {
                if (shouldOverwrite) {
                    WorkRecord existing = existingOpt.get();
                    LocalTime beforeStartTime = existing.getWrStartTime();
                    LocalTime beforeEndTime = existing.getWrEndTime();
                    LocalTime beforeRestTime = existing.getWrRestTime();

                    existing.setWrStartTime(startTime);
                    existing.setWrEndTime(endTime);
                    existing.setWrRestTime(restTime);
                    existing.setWrCreatedBy(requester.getUserIdx());
                    workRecordRepository.save(existing);

                    // 관리자가 엑셀 덮어쓰기로 수정한 경우 Audit Log 남기기
                    if (isAdmin(requester)) {
                        WorkRecordHistory history = WorkRecordHistory.builder()
                                .wrIdx(existing.getWrIdx())
                                .adminUser(requester)
                                .targetUser(existing.getUser())
                                .wrDate(existing.getWrDate())
                                .beforeStartTime(beforeStartTime)
                                .beforeEndTime(beforeEndTime)
                                .beforeRestTime(beforeRestTime)
                                .afterStartTime(existing.getWrStartTime())
                                .afterEndTime(existing.getWrEndTime())
                                .afterRestTime(existing.getWrRestTime())
                                .actionType(ACTION_UPDATE)
                                .build();
                        workRecordHistoryRepository.save(history);
                    }

                    updatedRecordsCount++;
                    userRecordCounts.put(name, userRecordCounts.getOrDefault(name, 0) + 1);
                    workPlaceRecordCounts.put(wpLabel, workPlaceRecordCounts.getOrDefault(wpLabel, 0) + 1);
                } else {
                    skippedRecordsCount++;
                }
            } else {
                WorkRecord newRecord = WorkRecord.builder()
                        .user(user)
                        .workPlace(recordWp)
                        .wrDate(wrDate)
                        .wrStartTime(startTime)
                        .wrEndTime(endTime)
                        .wrRestTime(restTime)
                        .wrCreatedBy(requester.getUserIdx())
                        .build();
                workRecordRepository.save(newRecord);
                insertedRecordsCount++;
                userRecordCounts.put(name, userRecordCounts.getOrDefault(name, 0) + 1);
                workPlaceRecordCounts.put(wpLabel, workPlaceRecordCounts.getOrDefault(wpLabel, 0) + 1);
            }
        }

        int totalHandled = insertedRecordsCount + updatedRecordsCount;
        String message = String.format("총 %d건 처리 완료 (신규 %d건, 덮어쓰기 %d건, 건너뜀 %d건)",
                totalHandled, insertedRecordsCount, updatedRecordsCount, skippedRecordsCount);

        return com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadResponseDto.builder()
                .newUsersCount(newUsersCount)
                .existingUsersCount(existingUsersCount)
                .userRecordCounts(userRecordCounts)
                .workPlaceRecordCounts(workPlaceRecordCounts)
                .insertedRecordsCount(insertedRecordsCount)
                .updatedRecordsCount(updatedRecordsCount)
                .skippedRecordsCount(skippedRecordsCount)
                .totalRecordsCount(totalHandled)
                .message(message)
                .build();
    }

    private LocalTime parseTimeString(String raw, DateTimeFormatter fmt1, DateTimeFormatter fmt2, String fieldName) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String cleaned = raw.trim().replace('.', ':');
        try {
            return LocalTime.parse(cleaned, fmt1).withSecond(0).withNano(0);
        } catch (Exception ignored) {
        }
        try {
            return LocalTime.parse(cleaned, fmt2).withSecond(0).withNano(0);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " 형식 오류 (HH:mm 권장): " + raw);
        }
    }
}
