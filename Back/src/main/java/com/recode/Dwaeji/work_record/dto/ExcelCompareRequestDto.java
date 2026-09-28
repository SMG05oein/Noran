package com.recode.Dwaeji.work_record.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelCompareRequestDto {
    private String userName;
    private String userPhone;
    private LocalDate wrDate;
    private LocalTime wrStartTime;
    private LocalTime wrEndTime;
    private LocalTime wrRestTime;
    private String wpName;
}
