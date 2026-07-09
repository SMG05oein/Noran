package com.recode.Dwaeji.user.controller;

import com.recode.Dwaeji.user.dto.WorkPlaceDto;
import com.recode.Dwaeji.user.service.WorkPlaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import com.recode.Dwaeji.user.dto.WorkPlaceRequestDto;

import java.util.List;

@Tag(name = "WorkPlace API", description = "근무지 관련 API")
@RestController
@RequestMapping("/api/work-place")
@RequiredArgsConstructor
public class WorkPlaceController {

    private final WorkPlaceService workPlaceService;

    @Operation(summary = "전체 근무지 목록 조회", description = "시스템에 등록된 모든 근무지 목록을 반환합니다. (회원가입 등에서 사용)")
    @GetMapping("/all")
    public ResponseEntity<List<WorkPlaceDto>> getAllWorkPlaces() {
        return ResponseEntity.ok(workPlaceService.getAllWorkPlaces());
    }

    @Operation(summary = "단일 근무지 조회", description = "특정 근무지 정보를 조회합니다.")
    @GetMapping("/{wpIdx}")
    public ResponseEntity<WorkPlaceDto> getWorkPlaceById(@PathVariable Long wpIdx) {
        return ResponseEntity.ok(workPlaceService.getWorkPlaceById(wpIdx));
    }

    @Operation(summary = "근무지 생성", description = "관리자 전용. 새로운 근무지를 생성합니다.")
    @PostMapping
    public ResponseEntity<String> createWorkPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody WorkPlaceRequestDto requestDto) {
        if (userDetails == null) return ResponseEntity.status(401).body("로그인이 필요합니다.");
        workPlaceService.createWorkPlace(userDetails.getUsername(), requestDto);
        return ResponseEntity.ok("근무지가 성공적으로 생성되었습니다.");
    }

    @Operation(summary = "근무지 수정", description = "관리자 전용. 기존 근무지 정보를 수정합니다.")
    @PutMapping("/{wpIdx}")
    public ResponseEntity<String> updateWorkPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wpIdx,
            @RequestBody WorkPlaceRequestDto requestDto) {
        if (userDetails == null) return ResponseEntity.status(401).body("로그인이 필요합니다.");
        workPlaceService.updateWorkPlace(userDetails.getUsername(), wpIdx, requestDto);
        return ResponseEntity.ok("근무지가 성공적으로 수정되었습니다.");
    }

    @Operation(summary = "근무지 삭제", description = "관리자 전용. 특정 근무지를 삭제합니다.")
    @DeleteMapping("/{wpIdx}")
    public ResponseEntity<String> deleteWorkPlace(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wpIdx) {
        if (userDetails == null) return ResponseEntity.status(401).body("로그인이 필요합니다.");
        workPlaceService.deleteWorkPlace(userDetails.getUsername(), wpIdx);
        return ResponseEntity.ok("근무지가 성공적으로 삭제되었습니다.");
    }
}
