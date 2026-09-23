package com.recode.Dwaeji.joke.impl;

import com.recode.Dwaeji.joke.database.Joke;
import com.recode.Dwaeji.joke.dto.JokeCreateRequestDto;
import com.recode.Dwaeji.joke.dto.JokeResponseDto;
import com.recode.Dwaeji.joke.dto.JokeUpdateRequestDto;
import com.recode.Dwaeji.joke.repository.JokeRepository;
import com.recode.Dwaeji.joke.service.JokeService;
import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JokeServiceImpl implements JokeService {

    private final JokeRepository jokeRepository;
    private final UserRepository userRepository;

    private User getRequester(String username) {
        if (username == null || username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userRepository.findByUserId(username)
                .orElseGet(() -> userRepository.findByUserEmail(username)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다.")));
    }

    private User getRequesterOptional(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }
        return userRepository.findByUserId(username)
                .orElseGet(() -> userRepository.findByUserEmail(username).orElse(null));
    }

    private boolean isAdmin(User user) {
        return user != null && user.getUserType() != null && user.getUserType().getUtIsAdmin() != null && user.getUserType().getUtIsAdmin() == 1;
    }

    @Override
    @Transactional(readOnly = true)
    public List<JokeResponseDto> getJokes(Boolean myOnly, Long targetUserIdx, String keyword, Integer page, Integer size, String username) {
        User currentUser = getRequesterOptional(username);

        Long filterUserIdx = null;
        if (Boolean.TRUE.equals(myOnly)) {
            if (currentUser == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
            }
            filterUserIdx = currentUser.getUserIdx();
        } else if (targetUserIdx != null) {
            filterUserIdx = targetUserIdx;
        }

        int pageNum = (page != null && page >= 0) ? page : 0;
        int pageSize = (size != null && size > 0) ? size : 100;
        Pageable pageable = PageRequest.of(pageNum, pageSize);
        Page<Joke> jokePage = jokeRepository.findJokesWithFilter(filterUserIdx, keyword, pageable);

        return jokePage.getContent().stream().map(joke -> {
            boolean canViewRealAuthor = currentUser != null && (isAdmin(currentUser) || joke.getUser().getUserIdx().equals(currentUser.getUserIdx()));
            return JokeResponseDto.fromEntity(joke, canViewRealAuthor);
        }).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public JokeResponseDto getTodayJoke(String username) {
        User currentUser = getRequesterOptional(username);
        List<Joke> activeJokes = jokeRepository.findAllActiveJokes();

        if (activeJokes.isEmpty()) {
            return null;
        }

        // 오늘의 날짜 기준 고정 추천 농담 인덱스 계산 (매일 동일하게 추천)
        int index = Math.abs(LocalDate.now().hashCode()) % activeJokes.size();
        Joke todayJoke = activeJokes.get(index);

        boolean canViewRealAuthor = currentUser != null && (isAdmin(currentUser) || todayJoke.getUser().getUserIdx().equals(currentUser.getUserIdx()));
        return JokeResponseDto.fromEntity(todayJoke, canViewRealAuthor);
    }

    @Override
    @Transactional
    public JokeResponseDto createJoke(JokeCreateRequestDto requestDto, String username) {
        User user = getRequester(username);

        String situation = requestDto.resolveSituation();
        String setup = requestDto.resolveSetup();
        String punchline = requestDto.resolvePunchline();

        Joke joke = Joke.builder()
                .user(user)
                .authorName(user.getUserName())
                .situation(situation)
                .setup(setup)
                .punchline(punchline)
                .detail(requestDto.getDetail())
                .emojiIdx(requestDto.getEmojiIdx() != null ? requestDto.getEmojiIdx() : 0)
                .isAnonymous(Boolean.TRUE.equals(requestDto.getIsAnonymous()))
                .isDeleted(false)
                .build();

        Joke saved = jokeRepository.save(joke);
        return JokeResponseDto.fromEntity(saved, true);
    }

    @Override
    @Transactional
    public JokeResponseDto updateJoke(Long jokeId, JokeUpdateRequestDto requestDto, String username) {
        User user = getRequester(username);

        Joke joke = jokeRepository.findByJokeIdAndIsDeletedFalse(jokeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않거나 삭제된 농담입니다."));

        if (!joke.getUser().getUserIdx().equals(user.getUserIdx())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인이 작성한 농담만 수정할 수 있습니다.");
        }

        joke.setSituation(requestDto.resolveSituation());
        joke.setSetup(requestDto.resolveSetup());
        joke.setPunchline(requestDto.resolvePunchline());
        joke.setDetail(requestDto.getDetail());
        if (requestDto.getEmojiIdx() != null) {
            joke.setEmojiIdx(requestDto.getEmojiIdx());
        }
        if (requestDto.getIsAnonymous() != null) {
            joke.setIsAnonymous(requestDto.getIsAnonymous());
        }

        Joke updated = jokeRepository.save(joke);
        return JokeResponseDto.fromEntity(updated, true);
    }

    @Override
    @Transactional
    public void deleteJoke(Long jokeId, String username) {
        User user = getRequester(username);

        Joke joke = jokeRepository.findByJokeIdAndIsDeletedFalse(jokeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않거나 이미 삭제된 농담입니다."));

        if (!joke.getUser().getUserIdx().equals(user.getUserIdx()) && !isAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "농담 삭제 권한이 없습니다.");
        }

        joke.setIsDeleted(true);
        joke.setDeletedAt(LocalDateTime.now());
        jokeRepository.save(joke);
    }
}
