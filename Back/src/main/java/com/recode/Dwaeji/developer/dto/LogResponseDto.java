package com.recode.Dwaeji.developer.dto;

import lombok.*;

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
