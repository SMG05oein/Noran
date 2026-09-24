package com.recode.Dwaeji.developer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogResponseDto {
    private Boolean available;
    private String message;
    private List<String> logs;
    private Integer totalLines;
    private Integer matchedLines;
    private Boolean filtered;
}
