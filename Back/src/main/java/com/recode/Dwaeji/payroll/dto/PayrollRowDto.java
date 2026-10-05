package com.recode.Dwaeji.payroll.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollRowDto {
    private Long userIdx;
    private String userName;
    /**
     * 로그인 아이디
     */
    private String userId;
    /**
     * 휴대폰 번호
     */
    private String userPhone;
    /**
     * 동명이인 플래그: 동일 실명 활성 인원 수. &gt;1 이면 관리자 UI에 #userIdx
     */
    private Long nameSeq;
    /**
     * 유저 소속 근무지명
     */
    private String workPlaceName;
    /**
     * 시급 (민감권한 없으면 null)
     */
    private Integer hourlyWage;
    /**
     * 총근무시간(소수, 시간 단위)
     */
    private Double totalHours;
    /**
     * 세전 = floor(시급 × 총근무시간). 민감권한 없으면 null
     */
    private Integer preTaxPay;
}
