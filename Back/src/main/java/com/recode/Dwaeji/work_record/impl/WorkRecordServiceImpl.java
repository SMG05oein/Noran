package com.recode.Dwaeji.work_record.impl;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.work_record.database.WorkRecord;
import com.recode.Dwaeji.work_record.dto.WorkRecordRequestDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordResponseDto;
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
import java.util.List;
import java.util.stream.Collectors;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyWorkRepository;

@Service
@RequiredArgsConstructor
public class WorkRecordServiceImpl implements WorkRecordService {

    private final WorkRecordRepository workRecordRepository;
    private final UserRepository userRepository;
    private final WorkApplyWorkRepository workApplyWorkRepository;

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

        if (workRecordRepository.existsByUser_UserIdxAndWrDate(targetUser.getUserIdx(), requestDto.getWrDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "해당 유저는 이 날짜에 이미 근무 기록이 존재합니다.");
        }


        WorkRecord workRecord = WorkRecord.builder()
                .user(targetUser)
                .wrDate(requestDto.getWrDate())
                .wrStartTime(requestDto.getWrStartTime())
                .wrEndTime(requestDto.getWrEndTime())
                .wrRestTime(requestDto.getWrRestTime())
                .wrRemarks(requestDto.getWrRemarks())
                .build();

        workRecordRepository.save(workRecord);
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
                    records = workRecordRepository.findByWrDateBetweenAndUser_WorkPlace_WpIdxAndUser_UserNameContaining(startDate, endDate, workPlaceIdx, userName, pageable);
                } else if (workPlaceIdx != null) {
                    records = workRecordRepository.findByWrDateBetweenAndUser_WorkPlace_WpIdx(startDate, endDate, workPlaceIdx, pageable);
                } else if (userName != null && !userName.isEmpty()) {
                    records = workRecordRepository.findByWrDateBetweenAndUser_UserNameContaining(startDate, endDate, userName, pageable);
                } else {
                    records = workRecordRepository.findByWrDateBetween(startDate, endDate, pageable);
                }
            } else {
                if (workPlaceIdx != null && userName != null && !userName.isEmpty()) {
                    records = workRecordRepository.findByUser_WorkPlace_WpIdxAndUser_UserNameContaining(workPlaceIdx, userName, pageable);
                } else if (workPlaceIdx != null) {
                    records = workRecordRepository.findByUser_WorkPlace_WpIdx(workPlaceIdx, pageable);
                } else if (userName != null && !userName.isEmpty()) {
                    records = workRecordRepository.findByUser_UserNameContaining(userName, pageable);
                } else {
                    records = workRecordRepository.findAll(pageable);
                }
            }
        } else {
            records = workRecordRepository.findByUser_UserIdx(requester.getUserIdx(), pageable);
        }

        return records.map(this::mapToDto);
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

        if (requestDto.getWrDate() != null && !requestDto.getWrDate().equals(record.getWrDate())) {
            if (workRecordRepository.existsByUser_UserIdxAndWrDate(record.getUser().getUserIdx(), requestDto.getWrDate())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "변경하려는 날짜에 이미 근무 기록이 존재합니다.");
            }
            record.setWrDate(requestDto.getWrDate());
        }
        
        if (requestDto.getWrStartTime() != null) record.setWrStartTime(requestDto.getWrStartTime());
        if (requestDto.getWrEndTime() != null) record.setWrEndTime(requestDto.getWrEndTime());
        if (requestDto.getWrRestTime() != null) record.setWrRestTime(requestDto.getWrRestTime());
        if (requestDto.getWrRemarks() != null) record.setWrRemarks(requestDto.getWrRemarks());

        workRecordRepository.save(record);
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

        workRecordRepository.delete(record);
    }

    private WorkRecordResponseDto mapToDto(WorkRecord record) {
        // 해당 유저/날짜의 근무 신청 상태 조인
        java.time.LocalDate wrDate = record.getWrDate();
        java.time.LocalDate monday = wrDate.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        
        String applyStatus = workApplyWorkRepository
                .findByUser_UserIdxAndWawDate(record.getUser().getUserIdx(), monday)
                .map(apply -> {
                    com.recode.Dwaeji.work_apply_work.database.ApplyStatus status;
                    switch (wrDate.getDayOfWeek()) {
                        case MONDAY:    status = apply.getWawIsMon(); break;
                        case TUESDAY:   status = apply.getWawIsTue(); break;
                        case WEDNESDAY: status = apply.getWawIsWed(); break;
                        case THURSDAY:  status = apply.getWawIsThu(); break;
                        case FRIDAY:    status = apply.getWawIsFri(); break;
                        case SATURDAY:  status = apply.getWawIsSat(); break;
                        case SUNDAY:    status = apply.getWawIsSun(); break;
                        default:        status = com.recode.Dwaeji.work_apply_work.database.ApplyStatus.미신청;
                    }
                    return status != null ? status.name() : "미신청";
                })
                .orElse("신청없음"); // 신청서 자체가 없음

        return WorkRecordResponseDto.builder()
                .wrIdx(record.getWrIdx())
                .userIdx(record.getUser().getUserIdx())
                .userName(record.getUser().getUserName())
                .workPlaceName(record.getUser().getWorkPlace() != null ? record.getUser().getWorkPlace().getWpName() : null)
                .wrDate(record.getWrDate())
                .wrStartTime(record.getWrStartTime())
                .wrEndTime(record.getWrEndTime())
                .wrRestTime(record.getWrRestTime())
                .wrRemarks(record.getWrRemarks())
                .wrCreatedAt(record.getWrCreatedAt())
                .wrUpdatedAt(record.getWrUpdatedAt())
                .applyStatus(applyStatus)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] downloadExcel(String requesterId, int year, int month, Long workPlaceIdx) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        if (reqIsAdmin == null || reqIsAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 엑셀을 다운로드할 수 있습니다.");
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
                String userName = user != null && user.getUserName() != null ? user.getUserName() : "";
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
                
                String userName = user.getUserName() != null ? user.getUserName() : "";
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
