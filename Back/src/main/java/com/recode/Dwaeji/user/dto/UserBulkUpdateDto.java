package com.recode.Dwaeji.user.dto;

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
    private Integer userIsActive;
}
