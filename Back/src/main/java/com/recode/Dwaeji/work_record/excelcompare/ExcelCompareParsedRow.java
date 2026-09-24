package com.recode.Dwaeji.work_record.excelcompare;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelCompareParsedRow {
    /** 0-based data row index (header excluded) */
    private int rowIndex;
    private LocalDate wrDate;
    private String userName;
    private String wpName;
    private LocalTime wrStartTime;
    private LocalTime wrEndTime;
    private LocalTime wrRestTime;
}
