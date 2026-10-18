package com.recode.Dwaeji.common.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorResponseDto {
    private int status;
    private String error;
    private String msg;

    /** 프론트 호환용: response.data.message 로도 동일한 사유를 노출한다. */
    public String getMessage() {
        return msg;
    }
}
