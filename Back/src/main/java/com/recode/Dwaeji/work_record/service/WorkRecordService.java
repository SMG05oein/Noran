package com.recode.Dwaeji.work_record.service;

import com.recode.Dwaeji.work_record.dto.WorkRecordRequestDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordResponseDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordHistoryResponseDto;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import java.util.List;

public interface WorkRecordService {
    void createWorkRecord(String requesterId, WorkRecordRequestDto requestDto);
    java.util.List<com.recode.Dwaeji.work_record.dto.ExcelCompareResponseDto> compareExcelRecords(String requesterId, java.util.List<com.recode.Dwaeji.work_record.dto.ExcelCompareRequestDto> requestData);
    Page<WorkRecordResponseDto> getAllWorkRecords(String requesterId, Long workPlaceIdx, String userName, Integer year, Integer month, int page, int size, String sortBy, String sortDir);
    java.util.List<WorkRecordResponseDto> getMonthlyWorkRecords(String requesterId, int year, int month);
    WorkRecordResponseDto getWorkRecordById(String requesterId, Long wrIdx);
    void updateWorkRecord(String requesterId, Long wrIdx, WorkRecordRequestDto requestDto);
    void deleteWorkRecord(String requesterId, Long wrIdx);
    void restoreWorkRecord(String requesterId, Long wrhIdx);
    Page<WorkRecordHistoryResponseDto> getWorkRecordHistory(String requesterId, Integer year, Integer month, String keyword, org.springframework.data.domain.Pageable pageable);
    byte[] downloadExcel(String requesterId, int year, int month, Long workPlaceIdx);
}
