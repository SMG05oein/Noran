package com.recode.Dwaeji.work_record.excelcompare;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelCompareParsedRow {
    /**
     * 0-based data row index (header excluded)
     */
    private int rowIndex;
    private LocalDate wrDate;
    private String userName;
    private String wpName;
    private LocalTime wrStartTime;
    private LocalTime wrEndTime;
    private LocalTime wrRestTime;
}
