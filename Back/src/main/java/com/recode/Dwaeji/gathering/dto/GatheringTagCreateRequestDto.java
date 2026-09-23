package com.recode.Dwaeji.gathering.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GatheringTagCreateRequestDto {

    @NotBlank(message = "태그명은 필수입니다.")
    @Size(max = 50, message = "태그명은 50자 이하여야 합니다.")
    private String name;

    @Min(value = 0, message = "이모지 인덱스는 0 이상이어야 합니다.")
    private Integer emojiIdx = 0;

    private String emoji;

    private String color;
}
