package com.recode.Dwaeji.user.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Builder;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBulkUpdateDto {
    private List<Long> userIdxList;
    private Integer userHourlyWage;
    @JsonAlias("isActive")
    private Integer userIsActive;
    /** Front 일괄 직급 변경 — 본인 포함 시 서버에서 거절 */
    private Long fkUtIdx;
}
