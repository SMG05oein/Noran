package com.recode.Dwaeji.work_record.impl;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.user.repository.WorkPlaceRepository;
import com.recode.Dwaeji.work_record.database.WorkRecord;
import com.recode.Dwaeji.work_record.dto.WorkRecordRequestDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordResponseDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordHistoryResponseDto;
import com.recode.Dwaeji.work_record.repository.WorkRecordHistoryRepository;
import com.recode.Dwaeji.work_record.database.WorkRecordHistory;
import com.recode.Dwaeji.work_record.repository.WorkRecordRepository;
import com.recode.Dwaeji.work_record.service.WorkRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;
import com.recode.Dwaeji.work_apply_work.database.WorkApplyDaily;
import com.recode.Dwaeji.work_apply_work.database.WorkScheduleDaily;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyDailyRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkScheduleDailyRepository;
import com.recode.Dwaeji.work_apply_work.database.ApplyStatus;

import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;

@Service
@RequiredArgsConstructor
public class WorkRecordServiceImpl implements WorkRecordService {

    private final WorkRecordRepository workRecordRepository;
    private final UserRepository userRepository;
    private final WorkRecordHistoryRepository workRecordHistoryRepository;
    private final WorkScheduleDailyRepository workScheduleDailyRepository;
    private final WorkApplyDailyRepository workApplyDailyRepository;
    private final WorkPlaceRepository workPlaceRepository;

    private User getRequester(String requesterId) {
        return userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
    }

    private boolean isAdmin(User user) {
        return user.getUserType() != null && user.getUserType().getUtIsAdmin() != null && user.getUserType().getUtIsAdmin() == 1;
    }

    @Override
    @Transactional
    public void createWorkRecord(String requesterId, WorkRecordRequestDto requestDto) {
        User requester = getRequester(requesterId);
        
        User targetUser = requester;
        if (isAdmin(requester) && requestDto.getUserIdx() != null) {
            targetUser = userRepository.findById(requestDto.getUserIdx())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "대리 기록할 사용자를 찾을 수 없습니다."));
        }

        if (!isAdmin(requester)) {
            java.time.LocalDateTime deadline = requestDto.getWrDate().plusMonths(1).withDayOfMonth(1).atTime(23, 59, 59);
            if (java.time.LocalDateTime.now().isAfter(deadline)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "기한이 지나 급여 담당자에게 직접 연락바랍니다");
            }
        }

        if (workRecordRepository.existsByUser_UserIdxAndWrDate(targetUser.getUserIdx(), requestDto.getWrDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "해당 유저는 이 날짜에 이미 근무 기록이 존재합니다.");
        }


        com.recode.Dwaeji.user.database.WorkPlace workPlace = null;
        if (requestDto.getWorkPlaceIdx() != null) {
            workPlace = workPlaceRepository.findById(requestDto.getWorkPlaceIdx()).orElse(null);
        }
        if (workPlace == null) {
            workPlace = targetUser.getWorkPlace(); // 기본값: 유저 소속 지점
        }

        WorkRecord workRecord = WorkRecord.builder()
                .user(targetUser)
                .workPlace(workPlace)
                .wrDate(requestDto.getWrDate())
                .wrStartTime(requestDto.getWrStartTime())
                .wrEndTime(requestDto.getWrEndTime())
                .wrRestTime(requestDto.getWrRestTime())
                .wrRemarks(requestDto.getWrRemarks())
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
                    .build();
            workRecordHistoryRepository.save(history);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.recode.Dwaeji.work_record.dto.ExcelCompareResponseDto> compareExcelRecords(String requesterId, List<com.recode.Dwaeji.work_record.dto.ExcelCompareRequestDto> requestData) {
        User requester = getRequester(requesterId);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 대조할 수 있습니다.");
        }

        List<com.recode.Dwaeji.work_record.dto.ExcelCompareResponseDto> results = new ArrayList<>();

        for (com.recode.Dwaeji.work_record.dto.ExcelCompareRequestDto req : requestData) {
            String status;
            WorkRecordResponseDto dbData = null;
            String msg = "";

            // Find User
            User user = userRepository.findByUserNameAndUserPhone(req.getUserName(), req.getUserPhone()).orElse(null);
            if (user == null) {
                status = "USER_NOT_FOUND";
                msg = "이름 및 연락처와 일치하는 사용자가 없습니다.";
            } else {
                WorkRecord record = workRecordRepository.findByUser_UserIdxAndWrDate(user.getUserIdx(), req.getWrDate()).orElse(null);
                if (record == null) {
                    status = "MISSING_IN_DB";
                    msg = "DB에 해당 날짜의 근무 기록이 없습니다.";
                } else {
                    dbData = WorkRecordResponseDto.fromEntity(record, null);
                    // Compare Time
                    boolean timeMatch = true;
                    if (req.getWrStartTime() != null && !req.getWrStartTime().equals(record.getWrStartTime())) timeMatch = false;
                    if (req.getWrEndTime() != null && !req.getWrEndTime().equals(record.getWrEndTime())) timeMatch = false;

                    if (timeMatch) {
                        status = "MATCH";
                        msg = "일치";
                    } else {
                        status = "MISMATCH_TIME";
                        msg = "근무 시간이 불일치합니다.";
                    }
                }
            }
            results.add(com.recode.Dwaeji.work_record.dto.ExcelCompareResponseDto.builder()
                    .requestData(req)
                    .status(status)
                    .dbData(dbData)
                    .message(msg)
                    .build());
        }
        return results;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WorkRecordResponseDto> getAllWorkRecords(String requesterId, Long workPlaceIdx, String userName, Integer year, Integer month, int page, int size, String sortBy, String sortDir) {
        User requester = getRequester(requesterId);

        org.springframework.data.domain.Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? org.springframework.data.domain.Sort.Direction.ASC : org.springframework.data.domain.Sort.Direction.DESC;
        String sortProperty;
        switch (sortBy != null ? sortBy : "date") {
            case "userName": sortProperty = "user.userName"; break;
            case "workPlace": sortProperty = "user.workPlace.wpName"; break;
            case "date": sortProperty = "wrDate"; break;
            default: sortProperty = "wrDate"; break;
        }

        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(direction, sortProperty));
        Page<WorkRecord> records;

        LocalDate startDate = null;
        LocalDate endDate = null;
        if (year != null && month != null) {
            java.time.YearMonth yearMonth = java.time.YearMonth.of(year, month);
            startDate = yearMonth.atDay(1);
            endDate = yearMonth.atEndOfMonth();
        }

        if (isAdmin(requester)) {
            if (startDate != null) {
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
                if (workPlaceIdx != null && userName != null && !userName.isEmpty()) {
                    records = workRecordRepository.findByWorkPlaceIdxAndUserNameFetch(workPlaceIdx, userName, pageable);
                } else if (workPlaceIdx != null) {
                    records = workRecordRepository.findByWorkPlaceIdxFetch(workPlaceIdx, pageable);
                } else if (userName != null && !userName.isEmpty()) {
                    records = workRecordRepository.findByUserNameFetch(userName, pageable);
                } else {
                    records = workRecordRepository.findByDateBetweenFetch(
                            LocalDate.now().minusYears(1), LocalDate.now().plusMonths(1), pageable);
                }
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
                return WorkRecordResponseDto.fromEntity(record, "미신청");
            }
            WorkScheduleDaily schedule = scheduleMap.get(record.getUser().getUserIdx() + "-" + wrDate);
            WorkApplyDaily apply = applyMap.get(record.getUser().getUserIdx() + "-" + wrDate);
            String applyStatus = resolveApplyStatus(schedule, apply);
            return WorkRecordResponseDto.fromEntity(record, applyStatus);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkRecordResponseDto> getMonthlyWorkRecords(String requesterId, int year, int month) {
        User requester = getRequester(requesterId);
        
        java.time.YearMonth yearMonth = java.time.YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();
        
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
                return WorkRecordResponseDto.fromEntity(record, "미신청");
            }
            WorkScheduleDaily schedule = scheduleMap.get(record.getUser().getUserIdx() + "-" + wrDate);
            WorkApplyDaily apply = applyMap.get(record.getUser().getUserIdx() + "-" + wrDate);
            String applyStatus = resolveApplyStatus(schedule, apply);
            return WorkRecordResponseDto.fromEntity(record, applyStatus);
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
            java.time.LocalDateTime deadline = record.getWrDate().plusMonths(1).withDayOfMonth(1).atTime(23, 59, 59);
            if (java.time.LocalDateTime.now().isAfter(deadline)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "기한이 지나 급여 담당자에게 직접 연락바랍니다");
            }
        }

        if (requestDto.getWrDate() != null && !requestDto.getWrDate().equals(record.getWrDate())) {
            if (workRecordRepository.existsByUser_UserIdxAndWrDate(record.getUser().getUserIdx(), requestDto.getWrDate())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "변경하려는 날짜에 이미 근무 기록이 존재합니다.");
            }
            record.setWrDate(requestDto.getWrDate());
        }
        
        boolean isTimeChanged = false;
        LocalTime beforeStartTime = record.getWrStartTime();
        LocalTime beforeEndTime = record.getWrEndTime();
        LocalTime beforeRestTime = record.getWrRestTime();

        if (requestDto.getWrStartTime() != null && !requestDto.getWrStartTime().equals(record.getWrStartTime())) {
            record.setWrStartTime(requestDto.getWrStartTime());
            isTimeChanged = true;
        }
        if (requestDto.getWrEndTime() != null && !requestDto.getWrEndTime().equals(record.getWrEndTime())) {
            record.setWrEndTime(requestDto.getWrEndTime());
            isTimeChanged = true;
        }
        if (requestDto.getWrRestTime() != null && !requestDto.getWrRestTime().equals(record.getWrRestTime())) {
            record.setWrRestTime(requestDto.getWrRestTime());
            isTimeChanged = true;
        }
        if (requestDto.getWrRemarks() != null) {
            record.setWrRemarks(requestDto.getWrRemarks());
        }
        if (requestDto.getWorkPlaceIdx() != null) {
            com.recode.Dwaeji.user.database.WorkPlace newWp = workPlaceRepository.findById(requestDto.getWorkPlaceIdx()).orElse(null);
            if (newWp != null) {
                record.setWorkPlace(newWp);
            }
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

        // 삭제 이력인지 확인 (삭제 이력은 after 시간이 모두 null임)
        if (history.getAfterStartTime() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 이력은 삭제 기록이 아닙니다.");
        }

        if (workRecordRepository.existsByUser_UserIdxAndWrDate(history.getTargetUser().getUserIdx(), history.getWrDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "해당 유저는 이 날짜에 이미 근무 기록이 존재하여 복구할 수 없습니다.");
        }

        WorkRecord restoredRecord = WorkRecord.builder()
                .user(history.getTargetUser())
                .wrDate(history.getWrDate())
                .wrStartTime(history.getBeforeStartTime())
                .wrEndTime(history.getBeforeEndTime())
                .wrRestTime(history.getBeforeRestTime())
                .wrRemarks("삭제된 기록 복구됨")
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

        return historyPage.map(h -> WorkRecordHistoryResponseDto.builder()
                .wrhIdx(h.getWrhIdx())
                .wrIdx(h.getWrIdx())
                .adminName(h.getAdminUser().getDisplayName())
                .targetUserName(h.getTargetUser().getDisplayName())
                .workPlaceName(h.getTargetUser().getWorkPlace() != null ? h.getTargetUser().getWorkPlace().getWpName() : null)
                .wrDate(h.getWrDate())
                .beforeStartTime(h.getBeforeStartTime())
                .beforeEndTime(h.getBeforeEndTime())
                .beforeRestTime(h.getBeforeRestTime())
                .afterStartTime(h.getAfterStartTime())
                .afterEndTime(h.getAfterEndTime())
                .afterRestTime(h.getAfterRestTime())
                .wrhCreatedAt(h.getWrhCreatedAt())
                .build());
    }

    private String resolveApplyStatus(WorkScheduleDaily schedule, WorkApplyDaily apply) {
        if (schedule != null && Boolean.TRUE.equals(schedule.getWsdIsConfirmed())
                && (schedule.getWsdStatus() == ApplyStatus.배정 || schedule.getWsdStatus() == ApplyStatus.타지점근무)) {
            return schedule.getWsdStatus() != null ? schedule.getWsdStatus().name() : "미신청";
        }
        if (apply != null) {
            return "신청"; // 오픈조 지원 여부와 무관하게 신청 내역이 있으면 신청 상태다.
        }
        return "미신청";
    }

    private WorkRecordResponseDto mapToDto(WorkRecord record) {
        java.time.LocalDate wrDate = record.getWrDate();
        if (wrDate == null || record.getUser() == null) {
            return WorkRecordResponseDto.fromEntity(record, "미신청");
        }
        
        WorkScheduleDaily schedule = workScheduleDailyRepository
                .findByUser_UserIdxAndWsdDate(record.getUser().getUserIdx(), wrDate)
                .orElse(null);

        WorkApplyDaily apply = workApplyDailyRepository
                .findByUser_UserIdxAndWadDate(record.getUser().getUserIdx(), wrDate)
                .orElse(null);

        String applyStatus = resolveApplyStatus(schedule, apply);
        return WorkRecordResponseDto.fromEntity(record, applyStatus);
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
            records = workRecordRepository.findByUser_WorkPlace_WpIdxAndWrDateBetween(workPlaceIdx, startDate, endDate);
        } else {
            records = workRecordRepository.findByWrDateBetween(startDate, endDate);
        }

        // 첫 번째 시트: 근무 기록
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet1 = workbook.createSheet(month + "월 근무기록");

            // 헤더 생성
            org.apache.poi.ss.usermodel.Row headerRow1 = sheet1.createRow(0);
            String[] headers1 = {"No", "날짜", "이름", "소속", "출근 시간", "퇴근 시간", "휴게 시간", "시급", "일급계산결과(세전)"};
            for (int i = 0; i < headers1.length; i++) {
                headerRow1.createCell(i).setCellValue(headers1[i]);
            }

            java.util.Map<Long, User> uniqueUsersMap = new java.util.HashMap<>();

            // 데이터 채우기
            int rowNum1 = 1;
            for (WorkRecord record : records) {
                User user = record.getUser();
                if (user != null && user.getUserIdx() != null) {
                    uniqueUsersMap.put(user.getUserIdx(), user);
                }
                
                org.apache.poi.ss.usermodel.Row row = sheet1.createRow(rowNum1++);

                String date = record.getWrDate() != null ? record.getWrDate().toString() : "";
                String userName = user != null && user.getDisplayName() != null ? user.getDisplayName() : "";
                String workPlace = user != null && user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : "";
                String startTime = record.getWrStartTime() != null ? record.getWrStartTime().toString() : "";
                String endTime = record.getWrEndTime() != null ? record.getWrEndTime().toString() : "";
                String restTimeStr = record.getWrRestTime() != null ? record.getWrRestTime().toString() : "00:00";
                
                Integer hourlyWage = user != null && user.getUserHourlyWage() != null ? user.getUserHourlyWage() : 0;

                // Calculate daily wage
                long dailyWage = 0;
                if (record.getWrStartTime() != null && record.getWrEndTime() != null && hourlyWage > 0) {
                    java.time.LocalTime start = record.getWrStartTime();
                    java.time.LocalTime end = record.getWrEndTime();
                    java.time.LocalTime rest = record.getWrRestTime() != null ? record.getWrRestTime() : java.time.LocalTime.MIDNIGHT;
                    
                    long startMinutes = start.getHour() * 60 + start.getMinute();
                    long endMinutes = end.getHour() * 60 + end.getMinute();
                    if (endMinutes < startMinutes) {
                        endMinutes += 24 * 60; // Next day
                    }
                    long totalMinutes = endMinutes - startMinutes;
                    long restMinutes = rest.getHour() * 60 + rest.getMinute();
                    long actualMinutes = totalMinutes - restMinutes;
                    if (actualMinutes < 0) actualMinutes = 0;
                    
                    dailyWage = (long) ((actualMinutes / 60.0) * hourlyWage);
                }

                row.createCell(0).setCellValue(rowNum1 - 1);
                row.createCell(1).setCellValue(date);
                row.createCell(2).setCellValue(userName);
                row.createCell(3).setCellValue(workPlace);
                row.createCell(4).setCellValue(startTime);
                row.createCell(5).setCellValue(endTime);
                row.createCell(6).setCellValue(restTimeStr);
                row.createCell(7).setCellValue(hourlyWage);
                row.createCell(8).setCellValue(dailyWage);
            }

            if (rowNum1 > 1) {
                sheet1.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, rowNum1 - 1, 0, headers1.length - 1));
            }
            for (int i = 0; i < headers1.length; i++) {
                sheet1.autoSizeColumn(i);
                int currentWidth = sheet1.getColumnWidth(i);
                sheet1.setColumnWidth(i, (int)(currentWidth * 1.3));
            }

            // 두 번째 시트: 알바생 정보
            org.apache.poi.ss.usermodel.Sheet sheet2 = workbook.createSheet("알바생 정보");
            org.apache.poi.ss.usermodel.Row headerRow2 = sheet2.createRow(0);
            String[] headers2 = {"No", "이름", "소속", "은행명", "계좌번호"};
            for (int i = 0; i < headers2.length; i++) {
                headerRow2.createCell(i).setCellValue(headers2[i]);
            }

            int rowNum2 = 1;
            for (User user : uniqueUsersMap.values()) {
                org.apache.poi.ss.usermodel.Row row = sheet2.createRow(rowNum2++);
                
                String userName = user.getDisplayName() != null ? user.getDisplayName() : "";
                String workPlace = user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : "";
                String bank = user.getUserBank() != null ? user.getUserBank() : "";
                String accountNo = user.getUserAccountNumber() != null ? user.getUserAccountNumber() : "";

                row.createCell(0).setCellValue(rowNum2 - 1);
                row.createCell(1).setCellValue(userName);
                row.createCell(2).setCellValue(workPlace);
                row.createCell(3).setCellValue(bank);
                row.createCell(4).setCellValue(accountNo);
            }

            if (rowNum2 > 1) {
                sheet2.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, rowNum2 - 1, 0, headers2.length - 1));
            }
            for (int i = 0; i < headers2.length; i++) {
                sheet2.autoSizeColumn(i);
                int currentWidth = sheet2.getColumnWidth(i);
                sheet2.setColumnWidth(i, (int)(currentWidth * 1.3));
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "엑셀 파일 생성 중 오류가 발생했습니다.");
        }
    }
}
