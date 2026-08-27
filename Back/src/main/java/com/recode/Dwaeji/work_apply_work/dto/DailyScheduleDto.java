package com.recode.Dwaeji.work_apply_work.dto;

import com.recode.Dwaeji.user.database.User;
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
public class DailyScheduleDto {
    private Long userIdx;
    private String userName;
    private String workPlaceName;
    private String startTime;

    public static DailyScheduleDto from(User user, String startTime) {
        if (user == null) return null;
        return DailyScheduleDto.builder()
                .userIdx(user.getUserIdx())
                .userName(user.getUserName())
                .workPlaceName(user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : null)
                .startTime(startTime)
                .build();
    }
}
