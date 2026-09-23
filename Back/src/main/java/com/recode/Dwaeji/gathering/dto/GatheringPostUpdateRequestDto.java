package com.recode.Dwaeji.gathering.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GatheringPostUpdateRequestDto {

    @NotNull(message = "태그 ID는 필수입니다.")
    private Integer tagId;

    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = 255, message = "제목은 255자 이하여야 합니다.")
    private String title;

    @NotBlank(message = "내용은 필수입니다.")
    private String content;

    @Min(value = 0, message = "이모지 인덱스는 0 이상이어야 합니다.")
    private Integer emojiIdx = 0;

    private Boolean isAnonymous = false;
}
