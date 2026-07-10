package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.dto.DevChangePwRequestDto;
import com.recode.Dwaeji.developer.dto.DevLoginRequestDto;
import com.recode.Dwaeji.developer.dto.DevLoginResponseDto;
import com.recode.Dwaeji.developer.service.DeveloperAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dev/auth")
@RequiredArgsConstructor
public class DeveloperAuthController {

    private final DeveloperAuthService developerAuthService;

    @PostMapping("/login")
    public ResponseEntity<DevLoginResponseDto> login(@RequestBody DevLoginRequestDto request) {
        DevLoginResponseDto response = developerAuthService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<String> changePassword(@AuthenticationPrincipal UserDetails userDetails, @RequestBody DevChangePwRequestDto request) {
        developerAuthService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok("비밀번호가 성공적으로 변경되었습니다.");
    }
}
