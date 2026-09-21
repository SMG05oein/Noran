package com.recode.Dwaeji.work_record.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelCompareResponseDto {
    private ExcelCompareRequestDto requestData;
    private String status; // "MATCH", "MISMATCH_TIME", "MISSING_IN_DB", "ONLY_IN_DB", "USER_NOT_FOUND"
    private WorkRecordResponseDto dbData;
    private String message;
}
