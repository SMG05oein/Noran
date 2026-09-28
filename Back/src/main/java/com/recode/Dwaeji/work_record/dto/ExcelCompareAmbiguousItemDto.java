package com.recode.Dwaeji.work_record.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelCompareAmbiguousItemDto {
    private int rowIndex;
    private LocalDate wrDate;
    private String userName;
    /** 엑셀 근무지 */
    private String wpName;
    /** 엑셀 출근 */
    private LocalTime wrStartTime;
    /** 엑셀 퇴근 */
    private LocalTime wrEndTime;
    /** 엑셀 휴게 */
    private LocalTime wrRestTime;
    private List<ExcelCompareCandidateDto> candidates;
}
