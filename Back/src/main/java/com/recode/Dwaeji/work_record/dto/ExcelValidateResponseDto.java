package com.recode.Dwaeji.work_record.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "엑셀 일괄 등록 전 사용자 사전 검증 응답 DTO")
public class ExcelValidateResponseDto {

    @Schema(description = "DB에 동일 이름이 2명 이상 존재하여 식별 불가한 이름 목록")
    private List<String> duplicateNames;

    @Schema(description = "DB에 존재하지 않는 잘못된 근무지(시트명) 목록")
    private List<String> invalidWorkPlaces;

    @Schema(description = "DB에 1명만 존재하는 기존 유저 목록")
    private List<ExistingUserDto> existingUsers;

    @Schema(description = "DB에 존재하지 않아 지점 지정이 필요한 신규 유저 이름 목록")
    private List<String> newUsers;

    @Schema(description = "이미 DB에 존재하는 중복 근무 기록 목록 (팝업 확인용)")
    private List<DuplicateRecordDto> existingRecords;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExistingUserDto {
        private String userName;
        private Long userIdx;
        private String workPlaceName;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @Schema(description = "중복 근무 기록 상세 정보")
    public static class DuplicateRecordDto {
        private String workDate;
        private String userName;
        private String workPlaceName;
        private String currentStartTime;
        private String currentEndTime;
        private String currentBreakTime;
        private String excelStartTime;
        private String excelEndTime;
        private String excelBreakTime;
    }
}
