package com.recode.Dwaeji.developer.dto;

import lombok.*;

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
