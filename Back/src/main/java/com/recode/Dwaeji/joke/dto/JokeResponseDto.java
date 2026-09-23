package com.recode.Dwaeji.joke.dto;

import com.recode.Dwaeji.joke.database.Joke;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JokeResponseDto {
    private Long jokeId;
    private Long id; // 프론트 호환용
    private Long userIdx;
    private String authorName;
    private String situation;
    private String setup;
    private String punchline;
    private String detail;
    private String name; // 프론트 호환용 (제목)
    private String message; // 프론트 호환용 (내용)
    private String badge; // 프론트 호환용 (뱃지)
    private Integer emojiIdx;
    private Boolean isAnonymous;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static JokeResponseDto fromEntity(Joke joke, boolean canViewRealAuthor) {
        if (joke == null) return null;

        String displayName = joke.getAuthorName();
        if (Boolean.TRUE.equals(joke.getIsAnonymous()) && !canViewRealAuthor) {
            displayName = "익명의 돼지 🐷";
        }

        String displayMessage = joke.getPunchline();
        if (joke.getDetail() != null && !joke.getDetail().isBlank()) {
            displayMessage = displayMessage + (displayMessage.isBlank() ? "" : " ") + joke.getDetail();
        }

        return JokeResponseDto.builder()
                .jokeId(joke.getJokeId())
                .id(joke.getJokeId())
                .userIdx(joke.getUser() != null ? joke.getUser().getUserIdx() : null)
                .authorName(displayName)
                .situation(joke.getSituation())
                .setup(joke.getSetup())
                .punchline(joke.getPunchline())
                .detail(joke.getDetail())
                .name(joke.getSetup())
                .message(displayMessage)
                .badge(joke.getSituation())
                .emojiIdx(joke.getEmojiIdx())
                .isAnonymous(joke.getIsAnonymous())
                .createdAt(joke.getCreatedAt())
                .updatedAt(joke.getUpdatedAt())
                .build();
    }
}
