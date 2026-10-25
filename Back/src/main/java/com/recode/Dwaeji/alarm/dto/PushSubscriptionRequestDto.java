package com.recode.Dwaeji.alarm.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "브라우저 PushSubscription.toJSON() 형태")
public class PushSubscriptionRequestDto {

    @NotBlank
    private String endpoint;

    @NotNull
    @Valid
    private Keys keys;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Keys {
        @NotBlank
        private String p256dh;

        @NotBlank
        private String auth;
    }
}
