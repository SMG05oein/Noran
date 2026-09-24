package com.recode.Dwaeji.work_record.excelcompare;

import com.recode.Dwaeji.work_record.dto.ExcelCompareResolveRequestDto;
import com.recode.Dwaeji.work_record.dto.ExcelCompareUploadResponseDto;
import org.springframework.web.multipart.MultipartFile;

public interface ExcelCompareService {
    byte[] buildTemplate();

    ExcelCompareUploadResponseDto startCompare(String requesterId, MultipartFile file, int year, int month);

    ExcelCompareUploadResponseDto resolveAndCompare(String requesterId, ExcelCompareResolveRequestDto request);

    byte[] downloadResult(String requesterId, String sessionId);
}
