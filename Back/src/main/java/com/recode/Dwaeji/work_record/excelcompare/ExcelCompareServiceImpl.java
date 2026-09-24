package com.recode.Dwaeji.work_record.excelcompare;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.database.WorkPlace;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.user.repository.WorkPlaceRepository;
import com.recode.Dwaeji.work_record.database.WorkRecord;
import com.recode.Dwaeji.work_record.dto.ExcelCompareResolveRequestDto;
import com.recode.Dwaeji.work_record.dto.ExcelCompareUploadResponseDto;
import com.recode.Dwaeji.work_record.repository.WorkRecordRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExcelCompareServiceImpl implements ExcelCompareService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("H:mm");
    private static final DateTimeFormatter TIME_FMT_HH = DateTimeFormatter.ofPattern("HH:mm");
    private static final DataFormatter DATA_FORMATTER = new DataFormatter(Locale.KOREA);

    private static final Map<String, Integer> STATUS_ORDER = Map.of(
            "USER_NOT_FOUND", 1,
            "AMBIGUOUS", 2,
            "MISSING_IN_DB", 3,
            "ONLY_IN_DB", 4,
            "MISMATCH_TIME", 5,
            "MISMATCH_WORKPLACE", 6,
            "MATCH", 7
    );

    private final UserRepository userRepository;
    private final WorkRecordRepository workRecordRepository;
    private final WorkPlaceRepository workPlaceRepository;
    private final ExcelCompareSessionStore sessionStore;

    @Override
    @Transactional(readOnly = true)
    public byte[] buildTemplate() {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            // 시트명 = 근무지, 시트 순서 = wpIdx 오름차순
            List<WorkPlace> places = workPlaceRepository.findAll(Sort.by(Sort.Direction.ASC, "wpIdx"));
            List<String> cols = ExcelCompareHeaders.REQUIRED;
            var dark = com.recode.Dwaeji.common.excel.ExcelDarkTheme.create(workbook);
            Set<String> usedSheetNames = new HashSet<>();

            if (places.isEmpty()) {
                writeTemplateSheet(workbook, dark, cols, "근무지", usedSheetNames, new String[][]{
                        {"2026-01-01", "홍길동", "근무지", "18:00", "23:00", "1:00"},
                });
            } else {
                for (WorkPlace wp : places) {
                    String wpName = wp.getWpName() != null && !wp.getWpName().isBlank() ? wp.getWpName() : "근무지";
                    writeTemplateSheet(workbook, dark, cols, wpName, usedSheetNames, new String[][]{
                            {"2026-01-01", "홍길동", wpName, "18:00", "23:00", "1:00"},
                    });
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "템플릿 생성 실패");
        }
    }

    private static void writeTemplateSheet(
            XSSFWorkbook workbook,
            com.recode.Dwaeji.common.excel.ExcelDarkTheme.Styles dark,
            List<String> cols,
            String baseName,
            Set<String> usedSheetNames,
            String[][] demos) {
        String sheetName = uniqueExcelSheetName(toExcelSheetName(baseName), usedSheetNames);
        Sheet sheet = workbook.createSheet(sheetName);
        Row header = sheet.createRow(0);
            for (int i = 0; i < cols.size(); i++) {
                header.createCell(i).setCellValue(cols.get(i));
                sheet.setColumnWidth(i, poiWidthFromDisplay(displayWidth(cols.get(i))));
            }
        for (int r = 0; r < demos.length; r++) {
            Row row = sheet.createRow(r + 1);
            for (int c = 0; c < demos[r].length; c++) {
                row.createCell(c).setCellValue(demos[r][c]);
            }
        }
        int lastDataRow = demos.length;
        sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, lastDataRow, 0, cols.size() - 1));
        com.recode.Dwaeji.common.excel.ExcelDarkTheme.apply(sheet, dark, lastDataRow, cols.size());
    }

    @Override
    @Transactional(readOnly = true)
    public ExcelCompareUploadResponseDto startCompare(String requesterId, MultipartFile file, int year, int month) {
        User requester = requireAdmin(requesterId);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "엑셀 파일이 필요합니다.");
        }

        ParsedExcel parsed = parseAndValidate(file);
        if (!parsed.columnErrors.isEmpty()) {
            return ExcelCompareUploadResponseDto.builder()
                    .phase("COLUMN_ERROR")
                    .messages(parsed.columnErrors)
                    .build();
        }

        String sessionId = UUID.randomUUID().toString();
        ExcelCompareSession session = ExcelCompareSession.builder()
                .sessionId(sessionId)
                .requesterId(requester.getUserId())
                .year(year)
                .month(month)
                .rows(parsed.rows)
                .resolutions(new HashMap<>())
                .createdAt(Instant.now())
                .build();
        sessionStore.put(session);

        // Front 선택 없음. 전부 자동 해소 후 바로 대조 → DONE (이상 건은 결과 상태 태그)
        autoResolveRows(session);
        CompareOutcome outcome = runCompareAndBuildExcel(session);
        session.setResultBytes(outcome.bytes);
        sessionStore.put(session);

        return ExcelCompareUploadResponseDto.builder()
                .phase("DONE")
                .sessionId(sessionId)
                .statusCounts(outcome.statusCounts)
                .totalCount(outcome.totalCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ExcelCompareUploadResponseDto resolveAndCompare(String requesterId, ExcelCompareResolveRequestDto request) {
        // 하위 호환용. Front 선택 UI는 쓰지 않음 — 업로드만으로 DONE.
        User requester = requireAdmin(requesterId);
        ExcelCompareSession session = sessionStore.get(request.getSessionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "대조 세션이 만료되었거나 없습니다. 다시 업로드하세요."));
        if (!Objects.equals(session.getRequesterId(), requester.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "세션 소유자가 아닙니다.");
        }

        if (request.getResolutions() != null) {
            for (ExcelCompareResolveRequestDto.Resolution r : request.getResolutions()) {
                session.getResolutions().put(r.getRowIndex(), r.getUserIdx());
            }
        }

        autoResolveRows(session);
        CompareOutcome outcome = runCompareAndBuildExcel(session);
        session.setResultBytes(outcome.bytes);
        sessionStore.put(session);

        return ExcelCompareUploadResponseDto.builder()
                .phase("DONE")
                .sessionId(session.getSessionId())
                .statusCounts(outcome.statusCounts)
                .totalCount(outcome.totalCount)
                .build();
    }

    @Override
    public byte[] downloadResult(String requesterId, String sessionId) {
        User requester = requireAdmin(requesterId);
        ExcelCompareSession session = sessionStore.get(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "대조 세션이 만료되었거나 없습니다."));
        if (!Objects.equals(session.getRequesterId(), requester.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "세션 소유자가 아닙니다.");
        }
        if (session.getResultBytes() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결과가 아직 준비되지 않았습니다.");
        }
        return session.getResultBytes();
    }

    private User requireAdmin(String requesterId) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        if (requester.getUserType() == null || requester.getUserType().getUtIsAdmin() == null
                || requester.getUserType().getUtIsAdmin() != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 대조할 수 있습니다.");
        }
        return requester;
    }

    private static class ParsedExcel {
        List<String> columnErrors = new ArrayList<>();
        List<ExcelCompareParsedRow> rows = new ArrayList<>();
    }

    private ParsedExcel parseAndValidate(MultipartFile file) {
        ParsedExcel result = new ParsedExcel();
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            if (workbook.getNumberOfSheets() == 0) {
                result.columnErrors.add("시트가 없습니다.");
                return result;
            }

            // 근무지별 Sheet 전부 읽음 (시트명 = 근무지). 행 인덱스는 파일 전체 기준 연속.
            int dataIndex = 0;
            boolean anySheetParsed = false;
            for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
                Sheet sheet = workbook.getSheetAt(s);
                if (sheet == null) {
                    continue;
                }
                Row headerRow = sheet.getRow(0);
                if (headerRow == null) {
                    // 빈 시트(헤더 없음)는 건너뜀
                    continue;
                }

                Map<Integer, String> headerByCol = new LinkedHashMap<>();
                short lastCell = headerRow.getLastCellNum();
                for (int i = 0; i < lastCell; i++) {
                    String h = cellString(headerRow.getCell(i)).trim();
                    if (!h.isEmpty()) {
                        headerByCol.put(i, h);
                    }
                }
                if (headerByCol.isEmpty()) {
                    continue;
                }

                // 출근/퇴근/휴게 등 키워드 포함 매핑. No·총근무시간 등 추가 컬럼은 무시. 순서 무관.
                List<String> sheetErrors = new ArrayList<>();
                Map<String, Integer> col = ExcelCompareHeaders.resolve(headerByCol, sheetErrors);
                if (!sheetErrors.isEmpty()) {
                    String prefix = "[" + sheet.getSheetName() + "] ";
                    for (String err : sheetErrors) {
                        result.columnErrors.add(prefix + err);
                    }
                    return result;
                }

                int maxCol = headerByCol.keySet().stream().mapToInt(Integer::intValue).max().orElse(0) + 1;
                String sheetWpName = sheet.getSheetName() != null ? sheet.getSheetName().trim() : "";
                anySheetParsed = true;
                for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null || isRowEmpty(row, maxCol)) {
                        continue;
                    }
                    String wpFromCell = cellString(row.getCell(col.get("근무지"))).trim();
                    // 근무지 칸이 비면 시트명(근무지)으로 채움
                    String wpName = !wpFromCell.isEmpty() ? wpFromCell : sheetWpName;
                    ExcelCompareParsedRow parsed = ExcelCompareParsedRow.builder()
                            .rowIndex(dataIndex++)
                            .wrDate(parseDate(row.getCell(col.get("날짜"))))
                            .userName(cellString(row.getCell(col.get("이름"))).trim())
                            .wpName(wpName)
                            .wrStartTime(parseTime(row.getCell(col.get("출근"))))
                            .wrEndTime(parseTime(row.getCell(col.get("퇴근"))))
                            .wrRestTime(parseTime(row.getCell(col.get("휴게"))))
                            .build();
                    if (parsed.getUserName().isEmpty() && parsed.getWrDate() == null) {
                        dataIndex--;
                        continue;
                    }
                    result.rows.add(parsed);
                }
            }
            if (!anySheetParsed) {
                result.columnErrors.add("헤더 행이 있는 시트가 없습니다.");
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "엑셀 파일을 읽을 수 없습니다.");
        }
        return result;
    }

    private boolean isRowEmpty(Row row, int cols) {
        for (int i = 0; i < cols; i++) {
            if (!cellString(row.getCell(i)).trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    /**
     * 동명이인 해소 — Front 선택 없음.
     * <pre>
     *  이름 1명 / 전부일치1 / 당일·동근무지1 / 당일기록1 → 자동
     *  전부일치 2명+ → 비해소 → 결과 상태 AMBIGUOUS (수동 확인)
     *  당일 0 등 → 비해소 → MISSING_IN_DB
     *  이름 0명 → USER_NOT_FOUND
     * </pre>
     */
    private void autoResolveRows(ExcelCompareSession session) {
        for (ExcelCompareParsedRow row : session.getRows()) {
            if (session.getResolutions().containsKey(row.getRowIndex())) {
                continue;
            }
            if (row.getUserName() == null || row.getUserName().isBlank()) {
                continue;
            }
            List<User> users = findUsersForCompare(session, row.getUserName());
            if (users.size() == 1) {
                session.getResolutions().put(row.getRowIndex(), users.get(0).getUserIdx());
                continue;
            }
            if (users.size() < 2) {
                continue;
            }

            List<User> fullHits = users.stream()
                    .filter(u -> hasFullMatchingSameDayRecord(u, row))
                    .collect(Collectors.toList());
            if (fullHits.size() == 1) {
                session.getResolutions().put(row.getRowIndex(), fullHits.get(0).getUserIdx());
                continue;
            }
            if (fullHits.size() > 1) {
                continue; // 결과 태그 AMBIGUOUS
            }

            List<User> wpHits = users.stream()
                    .filter(u -> hasSameWorkplaceSameDayRecord(u, row))
                    .collect(Collectors.toList());
            if (wpHits.size() == 1) {
                session.getResolutions().put(row.getRowIndex(), wpHits.get(0).getUserIdx());
                continue;
            }

            List<User> dayHits = users.stream()
                    .filter(u -> hasAnySameDayRecord(u, row))
                    .collect(Collectors.toList());
            if (dayHits.size() == 1) {
                session.getResolutions().put(row.getRowIndex(), dayHits.get(0).getUserIdx());
            }
        }
    }

    /**
     * 당일 DB 기록 중 엑셀과 근무지·출근·퇴근·휴게가 모두 같은 건이 하나라도 있으면 true.
     */
    private boolean hasFullMatchingSameDayRecord(User u, ExcelCompareParsedRow excelRow) {
        if (u.getUserIdx() == null || excelRow.getWrDate() == null) {
            return false;
        }
        List<WorkRecord> sameDay = workRecordRepository.findByUser_UserIdxAndWrDate(u.getUserIdx(), excelRow.getWrDate());
        if (sameDay == null || sameDay.isEmpty()) {
            return false;
        }
        return sameDay.stream().anyMatch(r -> workplaceAndTimesEqual(excelRow, r));
    }

    /** 당일·같은 근무지 기록이 있으면 true (시간 불일치 허용) */
    private boolean hasSameWorkplaceSameDayRecord(User u, ExcelCompareParsedRow excelRow) {
        if (u.getUserIdx() == null || excelRow.getWrDate() == null) {
            return false;
        }
        String excelWp = normalize(excelRow.getWpName());
        if (excelWp.isEmpty()) {
            return false;
        }
        List<WorkRecord> sameDay = workRecordRepository.findByUser_UserIdxAndWrDate(u.getUserIdx(), excelRow.getWrDate());
        if (sameDay == null || sameDay.isEmpty()) {
            return false;
        }
        return sameDay.stream().anyMatch(r -> excelWp.equals(normalize(wpNameOf(r))));
    }

    /** 당일 어느 근무지든 기록이 있으면 true */
    private boolean hasAnySameDayRecord(User u, ExcelCompareParsedRow excelRow) {
        if (u.getUserIdx() == null || excelRow.getWrDate() == null) {
            return false;
        }
        List<WorkRecord> sameDay = workRecordRepository.findByUser_UserIdxAndWrDate(u.getUserIdx(), excelRow.getWrDate());
        return sameDay != null && !sameDay.isEmpty();
    }

    private static boolean workplaceAndTimesEqual(ExcelCompareParsedRow excel, WorkRecord db) {
        return normalize(excel.getWpName()).equals(normalize(wpNameOf(db)))
                && Objects.equals(excel.getWrStartTime(), db.getWrStartTime())
                && Objects.equals(excel.getWrEndTime(), db.getWrEndTime())
                && Objects.equals(excel.getWrRestTime(), db.getWrRestTime());
    }

    private CompareOutcome runCompareAndBuildExcel(ExcelCompareSession session) {
        LocalDate start = LocalDate.of(session.getYear(), session.getMonth(), 1);
        LocalDate end = YearMonth.of(session.getYear(), session.getMonth()).atEndOfMonth();
        List<WorkRecord> dbRecords = workRecordRepository.findByWrDateBetween(start, end);

        Map<Long, User> userCache = new HashMap<>();
        Set<Long> matchedDbIds = new HashSet<>();
        List<ResultRow> results = new ArrayList<>();

        for (ExcelCompareParsedRow excelRow : session.getRows()) {
            Long userIdx = session.getResolutions().get(excelRow.getRowIndex());
            if (userIdx == null) {
                List<User> byName = excelRow.getUserName() != null && !excelRow.getUserName().isBlank()
                        ? findUsersForCompare(session, excelRow.getUserName())
                        : List.of();
                if (byName.isEmpty()) {
                    results.add(ResultRow.fromExcel(excelRow, "USER_NOT_FOUND", "이름과 일치하는 사용자가 없습니다.", null));
                    continue;
                }
                if (byName.size() > 1) {
                    List<User> fullHits = byName.stream()
                            .filter(u -> hasFullMatchingSameDayRecord(u, excelRow))
                            .collect(Collectors.toList());
                    if (fullHits.size() >= 2) {
                        results.add(ResultRow.fromExcel(excelRow, "AMBIGUOUS",
                                "동명이인 " + fullHits.size()
                                        + "명이 근무지·출근·퇴근·휴게가 모두 일치합니다. 수동 확인이 필요합니다.",
                                null));
                    } else {
                        results.add(ResultRow.fromExcel(excelRow, "MISSING_IN_DB",
                                "관리자 기록은 있으나 알바생 기록이 없습니다.", null));
                    }
                    continue;
                }
                userIdx = byName.get(0).getUserIdx();
            }
            final Long resolvedUserIdx = userIdx;

            User user = userCache.computeIfAbsent(resolvedUserIdx, id -> userRepository.findById(id).orElse(null));
            if (user == null) {
                results.add(ResultRow.fromExcel(excelRow, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", null));
                continue;
            }

            List<WorkRecord> sameDay = dbRecords.stream()
                    .filter(r -> r.getUser() != null && Objects.equals(r.getUser().getUserIdx(), resolvedUserIdx))
                    .filter(r -> Objects.equals(r.getWrDate(), excelRow.getWrDate()))
                    .collect(Collectors.toList());

            if (sameDay.isEmpty()) {
                results.add(ResultRow.fromExcel(excelRow, "MISSING_IN_DB", "관리자 기록은 있으나 알바생 기록이 없습니다.", user));
                continue;
            }

            String excelWp = normalize(excelRow.getWpName());
            WorkRecord wpMatch = sameDay.stream()
                    .filter(r -> normalize(wpNameOf(r)).equals(excelWp))
                    .findFirst()
                    .orElse(null);

            if (wpMatch == null) {
                WorkRecord any = sameDay.get(0);
                results.add(ResultRow.fromBoth(excelRow, any, "MISMATCH_WORKPLACE",
                        "근무지 엑셀=" + nullToEmpty(excelRow.getWpName())
                                + " / DB=" + wpNameOf(any), user));
                continue;
            }

            matchedDbIds.add(wpMatch.getWrIdx());
            boolean startDiff = !Objects.equals(excelRow.getWrStartTime(), wpMatch.getWrStartTime());
            boolean endDiff = !Objects.equals(excelRow.getWrEndTime(), wpMatch.getWrEndTime());
            boolean restDiff = !Objects.equals(excelRow.getWrRestTime(), wpMatch.getWrRestTime());
            if (!startDiff && !endDiff && !restDiff) {
                results.add(ResultRow.fromBoth(excelRow, wpMatch, "MATCH", "일치", user));
            } else {
                List<String> parts = new ArrayList<>();
                if (startDiff) {
                    parts.add("출근 엑셀=" + formatTime(excelRow.getWrStartTime())
                            + " / DB=" + formatTime(wpMatch.getWrStartTime()));
                }
                if (endDiff) {
                    parts.add("퇴근 엑셀=" + formatTime(excelRow.getWrEndTime())
                            + " / DB=" + formatTime(wpMatch.getWrEndTime()));
                }
                if (restDiff) {
                    parts.add("휴게 엑셀=" + formatTime(excelRow.getWrRestTime())
                            + " / DB=" + formatTime(wpMatch.getWrRestTime()));
                }
                ResultRow rr = ResultRow.fromBoth(excelRow, wpMatch, "MISMATCH_TIME",
                        String.join(", ", parts), user);
                rr.mismatchStart = startDiff;
                rr.mismatchEnd = endDiff;
                rr.mismatchRest = restDiff;
                results.add(rr);
            }
        }

        for (WorkRecord db : dbRecords) {
            if (matchedDbIds.contains(db.getWrIdx())) {
                continue;
            }
            results.add(ResultRow.fromDbOnly(db, "ONLY_IN_DB", "알바생 기록은 있으나 관리자 기록이 없습니다."));
        }

        results.sort(Comparator
                .comparingInt((ResultRow r) -> STATUS_ORDER.getOrDefault(r.status, 99))
                .thenComparing(r -> r.wrDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(r -> r.userName, Comparator.nullsLast(String::compareTo)));

        Map<String, Integer> statusCounts = new LinkedHashMap<>();
        for (String status : List.of(
                "USER_NOT_FOUND", "AMBIGUOUS", "MISSING_IN_DB", "ONLY_IN_DB",
                "MISMATCH_TIME", "MISMATCH_WORKPLACE", "MATCH")) {
            statusCounts.put(status, 0);
        }
        for (ResultRow r : results) {
            statusCounts.merge(r.status, 1, Integer::sum);
        }
        // 0건 상태는 요약에서 빼 Front가 짧게 보이게
        statusCounts.entrySet().removeIf(e -> e.getValue() == null || e.getValue() == 0);

        byte[] bytes = writeResultWorkbook(results);
        return new CompareOutcome(bytes, statusCounts, results.size());
    }

    private static final class CompareOutcome {
        final byte[] bytes;
        final Map<String, Integer> statusCounts;
        final int totalCount;

        CompareOutcome(byte[] bytes, Map<String, Integer> statusCounts, int totalCount) {
            this.bytes = bytes;
            this.statusCounts = statusCounts;
            this.totalCount = totalCount;
        }
    }

    private static String wpNameOf(WorkRecord r) {
        return r.getWorkPlace() != null ? r.getWorkPlace().getWpName() : "";
    }

    private static String normalize(String s) {
        return s == null ? "" : s.trim();
    }

    /** 대조 월 기준: 재직 + 당월 근무기록 있는 휴직·퇴사 포함 (비식별화 제외) */
    private List<User> findUsersForCompare(ExcelCompareSession session, String userName) {
        LocalDate start = LocalDate.of(session.getYear(), session.getMonth(), 1);
        LocalDate end = YearMonth.of(session.getYear(), session.getMonth()).atEndOfMonth();
        return userRepository.findNamedUsersForExcelCompare(userName.trim(), start, end);
    }

    private byte[] writeResultWorkbook(List<ResultRow> results) {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            String[] headers = {
                    "상태", "설명", "날짜", "이름", "근무지", "출근", "퇴근", "휴게",
                    "DB근무지", "DB출근", "DB퇴근", "DB휴게", "userIdx", "전화번호"
            };

            // 근무지별 시트 — 시트 순서 = wpIdx 오름차순 (미등록 근무지명은 맨 뒤)
            Map<String, Long> wpNameToIdx = workPlaceRepository.findAll(Sort.by(Sort.Direction.ASC, "wpIdx")).stream()
                    .filter(wp -> wp.getWpName() != null && !wp.getWpName().isBlank())
                    .collect(Collectors.toMap(
                            wp -> wp.getWpName().trim(),
                            WorkPlace::getWpIdx,
                            (a, b) -> a <= b ? a : b));

            Map<String, List<ResultRow>> byWp = new LinkedHashMap<>();
            for (ResultRow row : results) {
                String key = sheetKeyOf(row);
                byWp.computeIfAbsent(key, k -> new ArrayList<>()).add(row);
            }
            if (byWp.isEmpty()) {
                byWp.put("대조결과", new ArrayList<>());
            }

            List<Map.Entry<String, List<ResultRow>>> orderedSheets = byWp.entrySet().stream()
                    .sorted(Comparator
                            .comparingLong((Map.Entry<String, List<ResultRow>> e) ->
                                    wpNameToIdx.getOrDefault(e.getKey(), Long.MAX_VALUE))
                            .thenComparing(Map.Entry::getKey, Comparator.nullsLast(String::compareTo)))
                    .collect(Collectors.toList());

            var dark = com.recode.Dwaeji.common.excel.ExcelDarkTheme.create(workbook);
            Map<String, org.apache.poi.ss.usermodel.CellStyle> statusStyles = buildStatusStyles(workbook);
            Set<String> usedSheetNames = new HashSet<>();

            for (Map.Entry<String, List<ResultRow>> entry : orderedSheets) {
                String sheetName = uniqueExcelSheetName(toExcelSheetName(entry.getKey()), usedSheetNames);
                Sheet sheet = workbook.createSheet(sheetName);
                int[] maxDisplay = new int[headers.length];
                Row header = sheet.createRow(0);
                for (int i = 0; i < headers.length; i++) {
                    header.createCell(i).setCellValue(headers[i]);
                    noteColDisplay(maxDisplay, i, headers[i]);
                }

                List<ResultRow> sheetRows = entry.getValue();
                int r = 1;
                for (ResultRow row : sheetRows) {
                    Row excel = sheet.createRow(r++);
                    String[] cells = {
                            nullToEmpty(row.status),
                            nullToEmpty(row.message),
                            row.wrDate != null ? row.wrDate.toString() : "",
                            nullToEmpty(row.userName),
                            nullToEmpty(row.wpName),
                            formatTime(row.start),
                            formatTime(row.end),
                            formatTime(row.rest),
                            nullToEmpty(row.dbWpName),
                            formatTime(row.dbStart),
                            formatTime(row.dbEnd),
                            formatTime(row.dbRest),
                            row.userIdx != null ? String.valueOf(row.userIdx) : "",
                            nullToEmpty(row.userPhone)
                    };
                    for (int c = 0; c < cells.length; c++) {
                        if (c == 12 && row.userIdx != null) {
                            excel.createCell(c).setCellValue(row.userIdx);
                        } else {
                            excel.createCell(c).setCellValue(cells[c]);
                        }
                        noteColDisplay(maxDisplay, c, cells[c]);
                    }
                }

                // 열 너비 = (헤더·데이터 최장 표시폭) × 1.5 — 상수 배열 없음
                for (int i = 0; i < headers.length; i++) {
                    sheet.setColumnWidth(i, poiWidthFromDisplay(maxDisplay[i]));
                }
                int lastDataRow = Math.max(r - 1, 0);
                com.recode.Dwaeji.common.excel.ExcelDarkTheme.apply(sheet, dark, lastDataRow, headers.length);

                // 상태 열만 상태색. MISMATCH_TIME이면 틀린 출/퇴/휴게 셀만 primary/warning/info
                Map<String, org.apache.poi.ss.usermodel.CellStyle> timeDiffStyles = buildTimeDiffStyles(workbook);
                for (int i = 0; i < sheetRows.size(); i++) {
                    ResultRow rowData = sheetRows.get(i);
                    Row excel = sheet.getRow(i + 1);
                    if (excel == null) {
                        continue;
                    }
                    Cell statusCell = excel.getCell(0);
                    if (statusCell == null) {
                        statusCell = excel.createCell(0);
                    }
                    statusCell.setCellStyle(statusStyles.getOrDefault(rowData.status, dark.body()));

                    if ("MISMATCH_TIME".equals(rowData.status)) {
                        if (rowData.mismatchStart) {
                            tintTimePair(excel, 5, 9, timeDiffStyles.get("primary"));
                        }
                        if (rowData.mismatchEnd) {
                            tintTimePair(excel, 6, 10, timeDiffStyles.get("warning"));
                        }
                        if (rowData.mismatchRest) {
                            tintTimePair(excel, 7, 11, timeDiffStyles.get("info"));
                        }
                    }
                    if ("MISMATCH_WORKPLACE".equals(rowData.status)) {
                        // 근무지 셀(엑셀·DB) — 상태색과 동일
                        org.apache.poi.ss.usermodel.CellStyle wpStyle =
                                statusStyles.getOrDefault("MISMATCH_WORKPLACE", dark.body());
                        tintTimePair(excel, 4, 8, wpStyle);
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "결과 엑셀 생성 실패");
        }
    }

    /** 결과 시트 그룹 키: 엑셀 근무지 → DB근무지 → 미소속 */
    private static String sheetKeyOf(ResultRow row) {
        if (row.wpName != null && !row.wpName.isBlank()) {
            return row.wpName.trim();
        }
        if (row.dbWpName != null && !row.dbWpName.isBlank()) {
            return row.dbWpName.trim();
        }
        return "미소속";
    }

    private static String toExcelSheetName(String name) {
        if (name == null || name.isBlank()) {
            return "미소속";
        }
        String cleaned = name.replaceAll("[\\\\/?*\\[\\]]", " ").trim();
        if (cleaned.isEmpty()) {
            cleaned = "미소속";
        }
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

    /** 다크 배경용 상태별 틴트 — 상태(A열)에만 적용 */
    private static Map<String, org.apache.poi.ss.usermodel.CellStyle> buildStatusStyles(XSSFWorkbook workbook) {
        Map<String, byte[]> colors = Map.of(
                "USER_NOT_FOUND", com.recode.Dwaeji.common.excel.ExcelDarkTheme.rgbBytes(110, 36, 36),
                "AMBIGUOUS", com.recode.Dwaeji.common.excel.ExcelDarkTheme.rgbBytes(90, 50, 20),
                "MISSING_IN_DB", com.recode.Dwaeji.common.excel.ExcelDarkTheme.rgbBytes(110, 70, 24),
                "ONLY_IN_DB", com.recode.Dwaeji.common.excel.ExcelDarkTheme.rgbBytes(28, 55, 95),
                "MISMATCH_TIME", com.recode.Dwaeji.common.excel.ExcelDarkTheme.rgbBytes(100, 85, 22),
                "MISMATCH_WORKPLACE", com.recode.Dwaeji.common.excel.ExcelDarkTheme.rgbBytes(75, 40, 95),
                "MATCH", com.recode.Dwaeji.common.excel.ExcelDarkTheme.rgbBytes(28, 75, 42)
        );
        Map<String, org.apache.poi.ss.usermodel.CellStyle> styles = new HashMap<>();
        for (Map.Entry<String, byte[]> e : colors.entrySet()) {
            styles.put(e.getKey(), com.recode.Dwaeji.common.excel.ExcelDarkTheme.createBodyStyle(workbook, e.getValue()));
        }
        return styles;
    }

    /** Bootstrap 느낌: primary / warning / info — 틀린 시간 셀용 */
    private static Map<String, org.apache.poi.ss.usermodel.CellStyle> buildTimeDiffStyles(XSSFWorkbook workbook) {
        Map<String, byte[]> colors = Map.of(
                "primary", com.recode.Dwaeji.common.excel.ExcelDarkTheme.rgbBytes(13, 110, 253),   // #0d6efd
                "warning", com.recode.Dwaeji.common.excel.ExcelDarkTheme.rgbBytes(255, 193, 7),  // #ffc107
                "info", com.recode.Dwaeji.common.excel.ExcelDarkTheme.rgbBytes(13, 202, 240)     // #0dcaf0
        );
        Map<String, org.apache.poi.ss.usermodel.CellStyle> styles = new HashMap<>();
        for (Map.Entry<String, byte[]> e : colors.entrySet()) {
            styles.put(e.getKey(), com.recode.Dwaeji.common.excel.ExcelDarkTheme.createBodyStyle(workbook, e.getValue()));
        }
        return styles;
    }

    private static void tintTimePair(Row excel, int excelCol, int dbCol, org.apache.poi.ss.usermodel.CellStyle style) {
        if (style == null) {
            return;
        }
        for (int c : new int[]{excelCol, dbCol}) {
            Cell cell = excel.getCell(c);
            if (cell == null) {
                cell = excel.createCell(c);
            }
            cell.setCellStyle(style);
        }
    }

    /** 표시 폭: ASCII 1, 그 외(한글 등) 2 */
    private static int displayWidth(String s) {
        if (s == null || s.isEmpty()) {
            return 0;
        }
        int w = 0;
        for (int i = 0; i < s.length(); i++) {
            w += (s.charAt(i) > 0x7F) ? 2 : 1;
        }
        return w;
    }

    private static void noteColDisplay(int[] maxDisplay, int col, String text) {
        int w = displayWidth(text);
        if (w > maxDisplay[col]) {
            maxDisplay[col] = w;
        }
    }

    /** POI 단위(1/256자). 표시폭 × 1.5, 열당 상한으로 설명 장문 폭주 방지 */
    private static int poiWidthFromDisplay(int displayChars) {
        int capped = Math.min(Math.max(displayChars, 4), 72);
        int units = (int) Math.round(capped * 1.5 * 256);
        return Math.min(units, 255 * 256);
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String formatTime(LocalTime t) {
        return t == null ? "" : t.format(TIME_FMT_HH);
    }

    private static class ResultRow {
        String status;
        String message;
        LocalDate wrDate;
        String userName;
        String wpName;
        LocalTime start;
        LocalTime end;
        LocalTime rest;
        String dbWpName;
        LocalTime dbStart;
        LocalTime dbEnd;
        LocalTime dbRest;
        Long userIdx;
        String userPhone;
        boolean mismatchStart;
        boolean mismatchEnd;
        boolean mismatchRest;

        static ResultRow fromExcel(ExcelCompareParsedRow e, String status, String message, User user) {
            ResultRow r = new ResultRow();
            r.status = status;
            r.message = message;
            r.wrDate = e.getWrDate();
            r.userName = e.getUserName();
            r.wpName = e.getWpName();
            r.start = e.getWrStartTime();
            r.end = e.getWrEndTime();
            r.rest = e.getWrRestTime();
            r.userIdx = user != null ? user.getUserIdx() : null;
            r.userPhone = user != null ? user.getUserPhone() : null;
            return r;
        }

        static ResultRow fromBoth(ExcelCompareParsedRow e, WorkRecord db, String status, String message, User user) {
            ResultRow r = fromExcel(e, status, message, user);
            r.dbWpName = wpNameOf(db);
            r.dbStart = db.getWrStartTime();
            r.dbEnd = db.getWrEndTime();
            r.dbRest = db.getWrRestTime();
            if (r.userIdx == null && db.getUser() != null) {
                r.userIdx = db.getUser().getUserIdx();
            }
            if ((r.userPhone == null || r.userPhone.isBlank()) && db.getUser() != null) {
                r.userPhone = db.getUser().getUserPhone();
            }
            return r;
        }

        static ResultRow fromDbOnly(WorkRecord db, String status, String message) {
            ResultRow r = new ResultRow();
            r.status = status;
            r.message = message;
            r.wrDate = db.getWrDate();
            r.userName = db.getUser() != null ? db.getUser().getUserName() : "";
            r.wpName = wpNameOf(db);
            r.start = db.getWrStartTime();
            r.end = db.getWrEndTime();
            r.rest = db.getWrRestTime();
            r.dbWpName = r.wpName;
            r.dbStart = r.start;
            r.dbEnd = r.end;
            r.dbRest = r.rest;
            r.userIdx = db.getUser() != null ? db.getUser().getUserIdx() : null;
            r.userPhone = db.getUser() != null ? db.getUser().getUserPhone() : null;
            return r;
        }
    }

    private String cellString(Cell cell) {
        if (cell == null) {
            return "";
        }
        return DATA_FORMATTER.formatCellValue(cell).trim();
    }

    private LocalDate parseDate(Cell cell) {
        if (cell == null) {
            return null;
        }
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate();
        }
        String raw = cellString(cell);
        if (raw.isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(raw, DATE_FMT);
        } catch (DateTimeParseException ignored) {
        }
        try {
            return LocalDate.parse(raw, DateTimeFormatter.ofPattern("yyyy.M.d"));
        } catch (DateTimeParseException ignored) {
        }
        try {
            return LocalDate.parse(raw, DateTimeFormatter.ofPattern("yyyy/M/d"));
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜 형식 오류: " + raw);
        }
    }

    private LocalTime parseTime(Cell cell) {
        if (cell == null) {
            return null;
        }
        if (cell.getCellType() == CellType.NUMERIC) {
            if (DateUtil.isCellDateFormatted(cell)) {
                return cell.getLocalDateTimeCellValue().toLocalTime().withSecond(0).withNano(0);
            }
            double v = cell.getNumericCellValue();
            if (v >= 0 && v < 1) {
                int totalMinutes = (int) Math.round(v * 24 * 60);
                return LocalTime.of(totalMinutes / 60, totalMinutes % 60);
            }
        }
        String raw = cellString(cell);
        if (raw.isEmpty()) {
            return null;
        }
        raw = raw.replace('.', ':');
        try {
            return LocalTime.parse(raw, TIME_FMT).withSecond(0).withNano(0);
        } catch (DateTimeParseException ignored) {
        }
        try {
            return LocalTime.parse(raw, TIME_FMT_HH).withSecond(0).withNano(0);
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시간 형식 오류: " + raw);
        }
    }
}
