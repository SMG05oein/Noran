package com.recode.Dwaeji.work_record.service;

import com.recode.Dwaeji.work_record.dto.WorkRecordHistoryResponseDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordRequestDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordResponseDto;
import org.springframework.data.domain.Page;
import com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadRequestDto;
import com.recode.Dwaeji.work_record.dto.AdminWorkRecordExcelUploadResponseDto;
import com.recode.Dwaeji.work_record.dto.ExcelValidateRequestDto;
import com.recode.Dwaeji.work_record.dto.ExcelValidateResponseDto;
import com.recode.Dwaeji.work_record.dto.UnrecordedWorkDto;

public interface WorkRecordService {
    WorkRecordResponseDto createWorkRecord(String requesterId, WorkRecordRequestDto requestDto);

    Page<WorkRecordResponseDto> getAllWorkRecords(String requesterId, Long workPlaceIdx, String userName, Integer year, Integer month, int page, int size, String sortBy, String sortDir);

    java.util.List<WorkRecordResponseDto> getMonthlyWorkRecords(String requesterId, java.time.LocalDate startDate, java.time.LocalDate endDate);

    WorkRecordResponseDto getWorkRecordById(String requesterId, Long wrIdx);

    void updateWorkRecord(String requesterId, Long wrIdx, WorkRecordRequestDto requestDto);

    void deleteWorkRecord(String requesterId, Long wrIdx);

    void restoreWorkRecord(String requesterId, Long wrhIdx);

    Page<WorkRecordHistoryResponseDto> getWorkRecordHistory(String requesterId, Integer year, Integer month, String keyword, org.springframework.data.domain.Pageable pageable);

    byte[] downloadExcel(String requesterId, int year, int month, Long workPlaceIdx);

    ExcelValidateResponseDto validateExcelUsers(String requesterId, ExcelValidateRequestDto requestDto);

    AdminWorkRecordExcelUploadResponseDto uploadWorkRecordsFromExcel(String requesterId, AdminWorkRecordExcelUploadRequestDto requestDto);

    java.util.List<UnrecordedWorkDto> getUnrecordedWorkSchedules(String requesterId, int year, int month, Long workPlaceIdx);
}
