package com.recode.Dwaeji.joke.service;

import com.recode.Dwaeji.joke.dto.JokeCreateRequestDto;
import com.recode.Dwaeji.joke.dto.JokeResponseDto;
import com.recode.Dwaeji.joke.dto.JokeUpdateRequestDto;
import java.util.List;

public interface JokeService {

    List<JokeResponseDto> getJokes(Boolean myOnly, Long targetUserIdx, String keyword, Integer page, Integer size, String username);

    JokeResponseDto getTodayJoke(String username);

    JokeResponseDto createJoke(JokeCreateRequestDto requestDto, String username);

    JokeResponseDto updateJoke(Long jokeId, JokeUpdateRequestDto requestDto, String username);

    void deleteJoke(Long jokeId, String username);
}
