package com.recode.Dwaeji.developer.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnnouncementCreateRequestDto {

    @NotBlank(message = "제목은 필수 입력 항목입니다.")
    private String title;

    @NotBlank(message = "내용은 필수 입력 항목입니다.")
    private String content;

    private Boolean isActive;

    private java.time.LocalDate startDate;

    private java.time.LocalDate endDate;
}
