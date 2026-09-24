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
public class DevSqlQueryRequestDto {
    private String id;
    private String pw;
    private String sql;
    /** default true */
    private Boolean readOnly;
    /** required for dangerous SQL */
    private Boolean confirmDangerous;
}
