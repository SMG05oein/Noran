package com.recode.Dwaeji.gathering.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GatheringCommentCreateRequestDto {

    @NotBlank(message = "댓글 내용은 필수입니다.")
    private String content;

    private Boolean isAnonymous = false;
}
