package com.recode.Dwaeji.developer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopEndpointDto {
    private String path;
    private String method;
    private Long count;
    private Double avgResponseTimeMs;
    private Long maxResponseTimeMs;
}
