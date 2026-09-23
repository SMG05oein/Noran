package com.recode.Dwaeji.joke.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JokeUpdateRequestDto {

    private String situation;
    private String setup;
    private String punchline;
    private String detail;

    // 프론트 호환용 필드
    private String name;
    private String message;
    private String badge;
    private String category;

    @Min(value = 0, message = "이모지 인덱스는 0 이상이어야 합니다.")
    private Integer emojiIdx = 0;

    private Boolean isAnonymous = false;

    public String resolveSituation() {
        if (situation != null && !situation.isBlank()) return situation;
        if (badge != null && !badge.isBlank()) return badge;
        return "노란돼지 일상";
    }

    public String resolveSetup() {
        if (setup != null && !setup.isBlank()) return setup;
        if (name != null && !name.isBlank()) return name;
        return "오늘의 농담";
    }

    public String resolvePunchline() {
        if (punchline != null && !punchline.isBlank()) return punchline;
        if (message != null && !message.isBlank()) return message;
        return "";
    }
}
