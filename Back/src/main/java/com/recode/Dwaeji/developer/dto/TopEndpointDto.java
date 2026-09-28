package com.recode.Dwaeji.developer.dto;

import lombok.*;

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
