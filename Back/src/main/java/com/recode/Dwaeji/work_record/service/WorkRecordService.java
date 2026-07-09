package com.recode.Dwaeji.work_record.service;

import com.recode.Dwaeji.work_record.dto.WorkRecordRequestDto;
import com.recode.Dwaeji.work_record.dto.WorkRecordResponseDto;

import org.springframework.data.domain.Page;
import java.util.List;

public interface WorkRecordService {
    void createWorkRecord(String requesterId, WorkRecordRequestDto requestDto);
    Page<WorkRecordResponseDto> getAllWorkRecords(String requesterId, Long workPlaceIdx, String userName, Integer year, Integer month, int page, int size, String sortBy, String sortDir);
    WorkRecordResponseDto getWorkRecordById(String requesterId, Long wrIdx);
    void updateWorkRecord(String requesterId, Long wrIdx, WorkRecordRequestDto requestDto);
    void deleteWorkRecord(String requesterId, Long wrIdx);
    
    byte[] downloadExcel(String requesterId, int year, int month, Long workPlaceIdx);
}
