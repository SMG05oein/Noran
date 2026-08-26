package com.recode.Dwaeji.common.dto;

import lombok.Setter;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorResponseDto {
    private int status;
    private String error;
    private String msg;
}
