package com.recode.Dwaeji.payroll.impl;

import com.recode.Dwaeji.payroll.dto.PayrollRowDto;
import com.recode.Dwaeji.payroll.service.PayrollService;
import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.user.repository.WorkPlaceRepository;
import com.recode.Dwaeji.work_record.database.WorkRecord;
import com.recode.Dwaeji.work_record.repository.WorkRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PayrollServiceImpl implements PayrollService {

    private final WorkRecordRepository workRecordRepository;
    private final UserRepository userRepository;
    private final WorkPlaceRepository workPlaceRepository;

    private User getRequester(String requesterId) {
        return userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
    }

    private boolean isAdmin(User user) {
        return user.getUserType() != null
                && user.getUserType().getUtIsAdmin() != null
                && user.getUserType().getUtIsAdmin() == 1;
    }

    private boolean canViewSensitive(User user) {
        return user.getUserType() != null
                && user.getUserType().getUtCanViewSensitive() != null
                && user.getUserType().getUtCanViewSensitive() == 1;
    }

    /** 퇴근−출근−휴게(분). 자정 넘김 허용. WorkRecord formatTotalWorkHours와 동일. */
    static long netWorkMinutes(LocalTime start, LocalTime end, LocalTime rest) {
        if (start == null || end == null) return 0L;
        long startMinutes = start.getHour() * 60L + start.getMinute();
        long endMinutes = end.getHour() * 60L + end.getMinute();
        if (endMinutes < startMinutes) endMinutes += 24 * 60;
        long restMinutes = rest != null ? rest.getHour() * 60L + rest.getMinute() : 0;
        return Math.max(0, endMinutes - startMinutes - restMinutes);
    }

    static double minutesToHours(long minutes) {
        return Math.round((minutes / 60.0) * 100.0) / 100.0;
    }

    static int calcPreTaxPay(Integer hourlyWage, double totalHours) {
        if (hourlyWage == null) return 0;
        return (int) Math.floor(hourlyWage * totalHours);
    }

    private List<WorkRecord> fetchMonthRecords(int year, int month, Long workPlaceIdx) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        if (workPlaceIdx != null) {
            // 직원의 본 소속(User.workPlace) 기준 필터링
            return workRecordRepository.findByUser_WorkPlace_WpIdxAndWrDateBetween(workPlaceIdx, startDate, endDate);
        }
        return workRecordRepository.findByWrDateBetween(startDate, endDate);
    }

    /**
     * 기록 목록을 유저별로 합산.
     * workPlaceName = 유저 소속 근무지(홈 지점).
     */
    private List<PayrollRowDto> aggregateByUser(List<WorkRecord> records, boolean includeSensitive) {
        Map<Long, Agg> byUser = new HashMap<>();
        for (WorkRecord record : records) {
            User user = record.getUser();
            if (user == null || user.getUserIdx() == null) continue;
            Agg agg = byUser.computeIfAbsent(user.getUserIdx(), id -> {
                Agg a = new Agg();
                a.userIdx = id;
                a.userName = user.getUserName();
                a.userId = user.getUserId();
                a.userPhone = user.getUserPhone();
                a.workPlaceName = user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : null;
                a.hourlyWage = user.getUserHourlyWage();
                return a;
            });
            agg.totalMinutes += netWorkMinutes(record.getWrStartTime(), record.getWrEndTime(), record.getWrRestTime());
        }

        List<PayrollRowDto> rows = new ArrayList<>();
        for (Agg agg : byUser.values()) {
            double hours = minutesToHours(agg.totalMinutes);
            Integer wage = includeSensitive ? agg.hourlyWage : null;
            Integer preTax = includeSensitive ? calcPreTaxPay(agg.hourlyWage, hours) : null;
            Long seq = userRepository.findNameSeqByUserIdx(agg.userIdx);
            rows.add(PayrollRowDto.builder()
                    .userIdx(agg.userIdx)
                    .userName(agg.userName)
                    .userId(agg.userId)
                    .userPhone(agg.userPhone)
                    .nameSeq(seq != null ? seq : 1L)
                    .workPlaceName(agg.workPlaceName)
                    .hourlyWage(wage)
                    .totalHours(hours)
                    .preTaxPay(preTax)
                    .build());
        }
        return rows;
    }

    private void sortRows(List<PayrollRowDto> rows, String sortBy, String sortDir) {
        boolean asc = !"desc".equalsIgnoreCase(sortDir);
        Comparator<PayrollRowDto> cmp;
        switch (sortBy != null ? sortBy : "userName") {
            case "workPlace":
            case "workPlaceName":
                cmp = Comparator.comparing(PayrollRowDto::getWorkPlaceName, Comparator.nullsLast(String::compareTo));
                break;
            case "hourlyWage":
                cmp = Comparator.comparing(PayrollRowDto::getHourlyWage, Comparator.nullsLast(Integer::compareTo));
                break;
            case "totalHours":
                cmp = Comparator.comparing(PayrollRowDto::getTotalHours, Comparator.nullsLast(Double::compareTo));
                break;
            case "preTaxPay":
                cmp = Comparator.comparing(PayrollRowDto::getPreTaxPay, Comparator.nullsLast(Integer::compareTo));
                break;
            case "userName":
            default:
                cmp = Comparator.comparing(PayrollRowDto::getUserName, Comparator.nullsLast(String::compareTo));
                break;
        }
        cmp = cmp.thenComparing(PayrollRowDto::getUserIdx, Comparator.nullsLast(Long::compareTo));
        if (!asc) cmp = cmp.reversed();
        rows.sort(cmp);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PayrollRowDto> getPayrollList(
            String requesterId,
            int year,
            int month,
            Long workPlaceIdx,
            String userName,
            int page,
            int size,
            String sortBy,
            String sortDir) {
        User requester = getRequester(requesterId);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 급여 목록을 조회할 수 있습니다.");
        }

        List<WorkRecord> records = fetchMonthRecords(year, month, workPlaceIdx);
        List<PayrollRowDto> rows = aggregateByUser(records, canViewSensitive(requester));

        if (userName != null && !userName.isBlank()) {
            String keyword = userName.trim();
            rows = rows.stream()
                    .filter(r -> r.getUserName() != null && r.getUserName().contains(keyword))
                    .collect(Collectors.toList());
        }

        sortRows(rows, sortBy, sortDir);

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, size);
        int from = Math.min(safePage * safeSize, rows.size());
        int to = Math.min(from + safeSize, rows.size());
        List<PayrollRowDto> content = rows.subList(from, to);

        return new PageImpl<>(content, PageRequest.of(safePage, safeSize), rows.size());
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] downloadExcel(String requesterId, int year, int month, Long workPlaceIdx) {
        User requester = getRequester(requesterId);
        Integer canExportExcel = requester.getUserType() != null
                ? requester.getUserType().getUtCanExportExcel() : null;
        if (canExportExcel == null || canExportExcel != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "엑셀 다운로드 권한이 없습니다.");
        }

        List<WorkRecord> records = fetchMonthRecords(year, month, workPlaceIdx);

        // 전체: 직원의 본 소속(User.workPlace)별 Sheet / 특정 지점: 해당 지점 Sheet 1개
        Map<Long, List<WorkRecord>> byWpIdx = new TreeMap<>(Comparator.nullsLast(Long::compareTo));
        if (workPlaceIdx != null) {
            byWpIdx.put(workPlaceIdx, records);
        } else {
            for (WorkRecord record : records) {
                User user = record.getUser();
                Long key = (user != null && user.getWorkPlace() != null) ? user.getWorkPlace().getWpIdx() : null;
                byWpIdx.computeIfAbsent(key, k -> new ArrayList<>()).add(record);
            }
            if (byWpIdx.isEmpty()) {
                byWpIdx.put(null, List.of());
            }
        }

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            String[] headers = {"이름", "세전", ""};
            var dark = com.recode.Dwaeji.common.excel.ExcelDarkTheme.create(workbook);
            Set<String> usedSheetNames = new HashSet<>();
            for (Map.Entry<Long, List<WorkRecord>> entry : byWpIdx.entrySet()) {
                List<PayrollRowDto> sheetRows = aggregateByUser(entry.getValue(), true);
                sheetRows.sort(Comparator
                        .comparing(PayrollRowDto::getUserName, Comparator.nullsLast(String::compareTo))
                        .thenComparing(PayrollRowDto::getUserIdx, Comparator.nullsLast(Long::compareTo)));

                String baseName = resolveSheetName(entry.getKey(), entry.getValue(), month, workPlaceIdx);
                String sheetName = uniqueExcelSheetName(toExcelSheetName(baseName), usedSheetNames);
                writePayrollSheet(workbook.createSheet(sheetName), headers, sheetRows, dark);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "엑셀 파일 생성 중 오류가 발생했습니다.");
        }
    }

    private String resolveSheetName(Long wpIdx, List<WorkRecord> sheetRecords, int month, Long filterWpIdx) {
        String fromUserHome = sheetRecords.stream()
                .map(r -> (r.getUser() != null && r.getUser().getWorkPlace() != null) ? r.getUser().getWorkPlace().getWpName() : null)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        if (fromUserHome != null) return fromUserHome;
        if (wpIdx != null) {
            return workPlaceRepository.findById(wpIdx)
                    .map(wp -> wp.getWpName() != null ? wp.getWpName() : "근무지")
                    .orElse("근무지");
        }
        if (filterWpIdx == null && sheetRecords.isEmpty()) {
            return month + "월 급여";
        }
        return "미소속";
    }

    private static String toExcelSheetName(String name) {
        if (name == null || name.isBlank()) return "미소속";
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

    private void writePayrollSheet(
            org.apache.poi.ss.usermodel.Sheet sheet,
            String[] headers,
            List<PayrollRowDto> rows,
            com.recode.Dwaeji.common.excel.ExcelDarkTheme.Styles dark) {
        org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);
        }

        int rowNum = 1;
        for (PayrollRowDto dto : rows) {
            org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum++);
            String name = dto.getUserName() != null ? dto.getUserName() : "";
            if (dto.getNameSeq() != null && dto.getNameSeq() > 1 && dto.getUserIdx() != null) {
                name = name.isEmpty() ? "#" + dto.getUserIdx() : name + " #" + dto.getUserIdx();
            }
            row.createCell(0).setCellValue(name);
            int preTax = dto.getPreTaxPay() != null ? dto.getPreTaxPay() : 0;
            row.createCell(1).setCellValue(String.format(Locale.KOREA, "%,d원", preTax));
            row.createCell(2).setCellValue("");
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

    private static class Agg {
        Long userIdx;
        String userName;
        String userId;
        String userPhone;
        String workPlaceName;
        Integer hourlyWage;
        long totalMinutes;
    }
}
