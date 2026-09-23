package com.recode.Dwaeji.joke.controller;

import com.recode.Dwaeji.joke.dto.JokeCreateRequestDto;
import com.recode.Dwaeji.joke.dto.JokeResponseDto;
import com.recode.Dwaeji.joke.dto.JokeUpdateRequestDto;
import com.recode.Dwaeji.joke.service.JokeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "오늘의 농담 API", description = "알바생 전용 꿀잼 썰 & 농담(CRUD, 오늘의 추천) API")
@RestController
@RequestMapping("/api/jokes")
@RequiredArgsConstructor
public class JokeController {

    private final JokeService jokeService;

    private String getUsername(UserDetails userDetails) {
        return userDetails != null ? userDetails.getUsername() : null;
    }

    @Operation(summary = "농담 목록 조회", description = "활성화된 농담 목록을 조회합니다. 본인 농담 필터(myOnly), 검색(keyword)을 지원합니다.")
    @GetMapping
    public ResponseEntity<List<JokeResponseDto>> getJokes(
            @RequestParam(required = false) Boolean myOnly,
            @RequestParam(required = false) Long userIdx,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(jokeService.getJokes(myOnly, userIdx, keyword, page, size, getUsername(userDetails)));
    }

    @Operation(summary = "오늘의 추천 농담 조회", description = "오늘의 추천 농담 단건을 조회합니다.")
    @GetMapping("/today")
    public ResponseEntity<JokeResponseDto> getTodayJoke(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(jokeService.getTodayJoke(getUsername(userDetails)));
    }

    @Operation(summary = "신규 농담 등록", description = "새로운 농담이나 썰을 등록합니다. (익명 선택 가능)")
    @PostMapping
    public ResponseEntity<JokeResponseDto> createJoke(
            @Valid @RequestBody JokeCreateRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(jokeService.createJoke(requestDto, getUsername(userDetails)));
    }

    @Operation(summary = "농담 수정", description = "작성자 본인만 농담을 수정할 수 있습니다.")
    @PutMapping("/{jokeId}")
    public ResponseEntity<JokeResponseDto> updateJoke(
            @PathVariable Long jokeId,
            @Valid @RequestBody JokeUpdateRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(jokeService.updateJoke(jokeId, requestDto, getUsername(userDetails)));
    }

    @Operation(summary = "농담 논리적 삭제", description = "농담을 논리적으로 삭제합니다. (작성자 본인 또는 관리자)")
    @DeleteMapping("/{jokeId}")
    public ResponseEntity<String> deleteJoke(
            @PathVariable Long jokeId,
            @AuthenticationPrincipal UserDetails userDetails) {
        jokeService.deleteJoke(jokeId, getUsername(userDetails));
        return ResponseEntity.ok("농담이 삭제되었습니다.");
    }
}
