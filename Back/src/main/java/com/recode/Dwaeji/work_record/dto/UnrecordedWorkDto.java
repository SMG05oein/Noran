package com.recode.Dwaeji.work_record.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "미작성 근무 배정 정보 DTO")
public class UnrecordedWorkDto {

    @Schema(description = "스케줄 PK", example = "101")
    private Long wsdIdx;

    @Schema(description = "알바생 유저 PK", example = "5")
    private Long userIdx;

    @Schema(description = "알바생 이름", example = "홍길동")
    private String userName;

    @Schema(description = "알바생 연락처", example = "010-1234-5678")
    private String userPhone;

    @Schema(description = "근무지 PK", example = "1")
    private Long workPlaceIdx;

    @Schema(description = "근무지 이름", example = "강남점")
    private String workPlaceName;

    @Schema(description = "배정된 근무일", example = "2026-10-19")
    private LocalDate workDate;

    @Schema(description = "배정 출근 시각", example = "10:00")
    private String startTime;

    @Schema(description = "배정 확정 여부", example = "true")
    private Boolean isConfirmed;

    @Schema(description = "오픈조 여부", example = "false")
    private Boolean isOpen;

    @Schema(description = "마감조 여부", example = "false")
    private Boolean isClose;
}
