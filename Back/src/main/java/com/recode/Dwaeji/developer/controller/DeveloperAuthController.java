package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.dto.DevChangePwRequestDto;
import com.recode.Dwaeji.developer.dto.DevIpOtpVerifyRequestDto;
import com.recode.Dwaeji.developer.dto.DevLoginRequestDto;
import com.recode.Dwaeji.developer.dto.DevLoginResponseDto;
import com.recode.Dwaeji.developer.filter.DevIpAllowlistFilter;
import com.recode.Dwaeji.developer.service.DevIpOtpService;
import com.recode.Dwaeji.developer.service.DeveloperAuthService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dev/auth")
@RequiredArgsConstructor
public class DeveloperAuthController {

    private final DeveloperAuthService developerAuthService;
    private final DevIpOtpService devIpOtpService;

    @PostMapping("/login")
    public ResponseEntity<DevLoginResponseDto> login(
            @RequestBody DevLoginRequestDto request,
            HttpServletRequest httpRequest) {
        String clientIp = DevIpAllowlistFilter.resolveClientIp(httpRequest);
        String ipToken = httpRequest.getHeader(DevIpOtpService.HEADER);
        DevLoginResponseDto response = developerAuthService.login(request, clientIp, ipToken);
        return ResponseEntity.ok(response);
    }

    /** IP allowlist 밖일 때: 인증번호 메일 발송 (수신 = spring.mail.username) */
    @PostMapping("/ip-otp/request")
    public ResponseEntity<Map<String, Object>> requestIpOtp(HttpServletRequest request) {
        String ip = DevIpAllowlistFilter.resolveClientIp(request);
        return ResponseEntity.ok(devIpOtpService.requestOtp(ip));
    }

    /** 인증번호 확인 → X-Dev-Ip-Token 발급 (해당 IP에만 유효) */
    @PostMapping("/ip-otp/verify")
    public ResponseEntity<Map<String, Object>> verifyIpOtp(
            @RequestBody DevIpOtpVerifyRequestDto body,
            HttpServletRequest request) {
        String ip = DevIpAllowlistFilter.resolveClientIp(request);
        return ResponseEntity.ok(devIpOtpService.verifyOtp(ip, body != null ? body.getCode() : null));
    }

    @PostMapping("/change-password")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<String> changePassword(@AuthenticationPrincipal UserDetails userDetails, @RequestBody DevChangePwRequestDto request) {
        developerAuthService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok("비밀번호가 성공적으로 변경되었습니다.");
    }
}
