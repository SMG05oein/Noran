package com.recode.Dwaeji.work_record.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Schema(description = "관리자 근무기록 엑셀 일괄 등록 요청 DTO")
public class AdminWorkRecordExcelUploadRequestDto {

    @Schema(description = "관리자가 엑셀 전체에 일괄 적용할 기본 지점 (선택사항, 지점이 지정되지 않은 신규 사용자 생성 시 폴백으로 활용 가능)")
    private Long workPlaceIdx;

    @Schema(description = "신규 사용자별 관리자 지정 소속 지점 매핑 목록")
    private List<UserWorkPlaceMappingDto> userWorkPlaces;

    @Schema(description = "동일 날짜/지점에 이미 존재하는 기존 근무 기록을 엑셀 데이터로 덮어쓸지 여부 (기본값: false, false일 경우 기존 기록은 건너뛰고 신규 기록만 추가)", example = "true")
    private Boolean overwriteExisting;

    @NotEmpty(message = "등록할 근무 기록 목록이 비어있습니다.")
    @Valid
    @Schema(description = "엑셀 파싱 근무 기록 목록")
    private List<ExcelRecordItemDto> records;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class UserWorkPlaceMappingDto {
        private String userName;
        private Long workPlaceIdx;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class ExcelRecordItemDto {
        @NotBlank(message = "근무일은 필수입니다.")
        @Schema(description = "근무일 (YYYY-MM-DD)", example = "2026-09-26")
        private String workDate;

        @NotBlank(message = "근무자 이름은 필수입니다.")
        @Schema(description = "근무자 이름", example = "김철수")
        private String userName;

        @NotBlank(message = "출근 시각은 필수입니다.")
        @Schema(description = "출근 시각 (HH:mm)", example = "09:00")
        private String startTime;

        @NotBlank(message = "퇴근 시각은 필수입니다.")
        @Schema(description = "퇴근 시각 (HH:mm)", example = "18:00")
        private String endTime;

        @Schema(description = "휴게 시간 (HH:mm 또는 공백/null)", example = "01:00")
        private String breakTime;

        @Schema(description = "근무지명 (시트명)", example = "강남점")
        private String workPlaceName;
    }
}
