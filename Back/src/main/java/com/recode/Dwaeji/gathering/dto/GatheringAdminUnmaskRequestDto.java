package com.recode.Dwaeji.gathering.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GatheringAdminUnmaskRequestDto {

    /**
     * 열람 대상 유형: "POST" (행별 단건) | "all" (전체 일괄)
     */
    @NotBlank(message = "targetType은 필수입니다. ('POST' 또는 'all')")
    private String targetType;

    /**
     * 단건 열람 시: 게시글 post_id
     * 전체 열람 시: 고정값 9 (또는 임의 값, 무시됨)
     */
    @NotNull(message = "targetId는 필수입니다.")
    private Long targetId;

    /**
     * 단건 열람 시: 실제 작성자의 user_idx
     * 전체 열람 시: 0
     */
    @NotNull(message = "targetUserId는 필수입니다.")
    private Long targetUserId;

    /**
     * 열람 사유 문자열 (예: "관리자 홍길동 열람", "관리자 전체 열람")
     */
    @NotBlank(message = "열람 사유(reason)는 필수입니다.")
    private String reason;
}
