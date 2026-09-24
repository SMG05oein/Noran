package com.recode.Dwaeji.work_record.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExcelCompareResolveRequestDto {
    @NotBlank
    private String sessionId;
    @NotEmpty
    private List<Resolution> resolutions;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Resolution {
        @NotNull
        private Integer rowIndex;
        @NotNull
        private Long userIdx;
    }
}
