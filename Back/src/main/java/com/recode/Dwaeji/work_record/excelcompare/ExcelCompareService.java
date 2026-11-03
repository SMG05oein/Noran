package com.recode.Dwaeji.work_record.excelcompare;

import com.recode.Dwaeji.work_record.dto.ExcelCompareResolveRequestDto;
import com.recode.Dwaeji.work_record.dto.ExcelCompareSessionSummaryDto;
import com.recode.Dwaeji.work_record.dto.ExcelCompareUploadResponseDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ExcelCompareService {
    byte[] buildTemplate();

    ExcelCompareUploadResponseDto startCompare(String requesterId, MultipartFile file, int year, int month);

    ExcelCompareUploadResponseDto checkStatus(String requesterId, String sessionId);

    void processCompareAsync(ExcelCompareSession session);

    ExcelCompareUploadResponseDto resolveAndCompare(String requesterId, ExcelCompareResolveRequestDto request);

    byte[] downloadResult(String requesterId, String sessionId);

    /** 로그인 관리자 본인의 유효 세션(최대 compare-max-sessions, TTL 2시간) */
    List<ExcelCompareSessionSummaryDto> listMySessions(String requesterId);
}
