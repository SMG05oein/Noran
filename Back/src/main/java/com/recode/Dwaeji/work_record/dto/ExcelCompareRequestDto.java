package com.recode.Dwaeji.work_record.dto;

import lombok.Builder;

import lombok.AllArgsConstructor;
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
public class ExcelCompareRequestDto {
    private String userName;
    private String userPhone;
    private LocalDate wrDate;
    private LocalTime wrStartTime;
    private LocalTime wrEndTime;
    private LocalTime wrRestTime;
    private String wpName;
}
