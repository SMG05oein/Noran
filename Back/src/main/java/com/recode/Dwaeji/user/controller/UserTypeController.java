package com.recode.Dwaeji.user.controller;

import com.recode.Dwaeji.user.dto.UserTypeDto;
import com.recode.Dwaeji.user.dto.UserTypeRequestDto;
import com.recode.Dwaeji.user.service.UserTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<UserTypeDto> createUserType(@Valid @RequestBody UserTypeRequestDto requestDto) {
        return ResponseEntity.ok(userTypeService.createUserType(requestDto));
    }

    @Operation(summary = "전체 직급 조회")
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
            @PathVariable Long utIdx,
            @Valid @RequestBody UserTypeRequestDto requestDto) {
        return ResponseEntity.ok(userTypeService.updateUserType(utIdx, requestDto));
    }

    @Operation(summary = "직급 삭제")
    @DeleteMapping("/{utIdx}")
    public ResponseEntity<Void> deleteUserType(@PathVariable Long utIdx) {
        userTypeService.deleteUserType(utIdx);
        return ResponseEntity.noContent().build();
    }
}
