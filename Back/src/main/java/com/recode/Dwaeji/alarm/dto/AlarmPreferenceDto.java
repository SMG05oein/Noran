package com.recode.Dwaeji.alarm.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "웹 푸시 알람 설정")
public class AlarmPreferenceDto {

    @NotNull
    private Boolean missingRecordEnabled;

    @NotNull
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "시각은 HH:mm 형식이어야 합니다.")
    @Schema(example = "22:00")
    private String missingRecordTime;

    @NotNull
    private Boolean assignConfirmEnabled;

    @NotNull
    private Boolean applyDeadlineEnabled;

    @NotNull
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "시각은 HH:mm 형식이어야 합니다.")
    @Schema(example = "22:00", description = "금요일 시각(요일 고정)")
    private String applyDeadlineFriTime;

    @NotNull
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "시각은 HH:mm 형식이어야 합니다.")
    @Schema(example = "22:00", description = "토요일 시각(요일 고정)")
    private String applyDeadlineSatTime;

    @NotNull
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "시각은 HH:mm 형식이어야 합니다.")
    @Schema(example = "12:00", description = "일요일 시각(요일 고정)")
    private String applyDeadlineSunTime;
}
