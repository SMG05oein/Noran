package com.recode.Dwaeji.work_record.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Schema(description = "엑셀 일괄 등록 전 사용자 사전 검증 요청 DTO")
public class ExcelValidateRequestDto {

    @NotEmpty(message = "검증할 사용자 이름 목록이 필요합니다.")
    @Schema(description = "엑셀에 등장한 중복 제거된 이름 목록", example = "[\"김철수\", \"이영희\", \"박지민\"]")
    private List<String> userNames;

    @Schema(description = "엑셀 시트명 목록(근무지명 검증용)", example = "[\"강남점\", \"서초점\"]")
    private List<String> workPlaceNames;

    @Schema(description = "기존 근무기록 중복 여부 확인을 위한 엑셀 파싱 레코드 목록")
    private List<AdminWorkRecordExcelUploadRequestDto.ExcelRecordItemDto> records;
}
