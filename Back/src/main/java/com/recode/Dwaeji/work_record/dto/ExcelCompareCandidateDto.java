package com.recode.Dwaeji.work_record.dto;

import lombok.*;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelCompareCandidateDto {
    private Long userIdx;
    private String userName;
    private String userId;
    /** 소속 근무지명 */
    private String workPlaceName;
    private Long workPlaceIdx;
    private String userPhone;
    /** 해당 날짜 DB 근무지 (기록 없으면 null) */
    private String dbWpName;
    /** 해당 날짜 DB 출근 */
    private LocalTime dbStartTime;
    /** 해당 날짜 DB 퇴근 */
    private LocalTime dbEndTime;
    /** 해당 날짜 DB 휴게 */
    private LocalTime dbRestTime;
}
