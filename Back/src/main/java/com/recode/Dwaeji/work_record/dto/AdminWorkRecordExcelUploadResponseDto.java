package com.recode.Dwaeji.work_record.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "관리자 근무기록 엑셀 일괄 등록 결과 응답 DTO")
public class AdminWorkRecordExcelUploadResponseDto {

    @Schema(description = "신규 생성된 임시 인원 수", example = "2")
    private int newUsersCount;

    @Schema(description = "기존 매칭된 인원 수", example = "5")
    private int existingUsersCount;

    @Schema(description = "사용자별 추가/수정된 기록 수 (예: 홍길동: 3개, 이영희: 2개)", example = "{\"홍길동\": 3, \"이영희\": 2}")
    private Map<String, Integer> userRecordCounts;

    @Schema(description = "지점(시트)별 등록/수정된 기록 수 (예: 노란돼지: 5개, 약산돼지: 3개, test: 2개)", example = "{\"노란돼지\": 5, \"약산돼지\": 3, \"test\": 2}")
    private Map<String, Integer> workPlaceRecordCounts;

    @Schema(description = "총 등록(신규 추가)된 근무 기록 수", example = "10")
    private int insertedRecordsCount;

    @Schema(description = "총 덮어쓰기(수정)된 근무 기록 수", example = "5")
    private int updatedRecordsCount;

    @Schema(description = "덮어쓰기를 선택하지 않아 건너뛴 근무 기록 수", example = "0")
    private int skippedRecordsCount;

    @Schema(description = "총 처리된 근무 기록 수", example = "15")
    private int totalRecordsCount;

    @Schema(description = "완료 메시지", example = "근무 기록이 성공적으로 등록되었습니다.")
    private String message;
}
