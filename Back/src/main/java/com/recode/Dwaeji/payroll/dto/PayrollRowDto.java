package com.recode.Dwaeji.payroll.dto;

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
public class PayrollRowDto {
    private Long userIdx;
    private String userName;
    /** 동명이인 구분 (1이면 단독, 2 이상이면 구분 번호) */
    private Long nameSeq;
    /** 유저 소속 근무지명 */
    private String workPlaceName;
    /** 시급 (민감권한 없으면 null) */
    private Integer hourlyWage;
    /** 총근무시간(소수, 시간 단위) */
    private Double totalHours;
    /** 세전 = floor(시급 × 총근무시간). 민감권한 없으면 null */
    private Integer preTaxPay;
}
