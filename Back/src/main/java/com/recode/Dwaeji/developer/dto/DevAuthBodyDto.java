package com.recode.Dwaeji.developer.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DevAuthBodyDto {
    private String id;
    private String pw;
}
