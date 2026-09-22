package com.recode.Dwaeji.user.controller;

import com.recode.Dwaeji.user.dto.UserTypeDto;
import com.recode.Dwaeji.user.dto.UserTypeRequestDto;
import com.recode.Dwaeji.user.service.UserTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "직급 API", description = "직급 CRUD API")
@RestController
@RequestMapping("/api/user-types")
@RequiredArgsConstructor
public class UserTypeController {

    private final UserTypeService userTypeService;

    @Operation(summary = "직급 생성")
    @PostMapping
    public ResponseEntity<UserTypeDto> createUserType(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UserTypeRequestDto requestDto) {
        return ResponseEntity.ok(userTypeService.createUserType(userDetails.getUsername(), requestDto));
    }

    @Operation(summary = "전체 직급 조회", description = "모든 직급과 각 직급의 권한 플래그를 반환합니다. (본인 권한뿐 아니라 타 직급 권한 포함)")
    @GetMapping
    public ResponseEntity<List<UserTypeDto>> getAllUserTypes() {
        return ResponseEntity.ok(userTypeService.getAllUserTypes());
    }

    @Operation(summary = "특정 직급 조회")
    @GetMapping("/{utIdx}")
    public ResponseEntity<UserTypeDto> getUserType(@PathVariable Long utIdx) {
        return ResponseEntity.ok(userTypeService.getUserType(utIdx));
    }

    @Operation(summary = "직급 수정")
    @PutMapping("/{utIdx}")
    public ResponseEntity<UserTypeDto> updateUserType(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long utIdx,
            @Valid @RequestBody UserTypeRequestDto requestDto) {
        return ResponseEntity.ok(userTypeService.updateUserType(userDetails.getUsername(), utIdx, requestDto));
    }

    @Operation(summary = "직급 삭제")
    @DeleteMapping("/{utIdx}")
    public ResponseEntity<Void> deleteUserType(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long utIdx) {
        userTypeService.deleteUserType(userDetails.getUsername(), utIdx);
        return ResponseEntity.noContent().build();
    }
}
