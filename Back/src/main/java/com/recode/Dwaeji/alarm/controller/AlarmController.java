package com.recode.Dwaeji.alarm.controller;

import com.recode.Dwaeji.alarm.dto.AlarmPreferenceDto;
import com.recode.Dwaeji.alarm.dto.PushSubscriptionRequestDto;
import com.recode.Dwaeji.alarm.dto.VapidPublicKeyResponse;
import com.recode.Dwaeji.alarm.service.AlarmDispatchService;
import com.recode.Dwaeji.alarm.service.AlarmPreferenceService;
import com.recode.Dwaeji.alarm.service.PushSubscriptionService;
import com.recode.Dwaeji.alarm.service.WebPushSender;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Tag(name = "웹 푸시 알람", description = "근무 관련 웹 푸시 알람 구독·설정 API")
@RestController
@RequestMapping("/api/alarms")
@RequiredArgsConstructor
public class AlarmController {

    private final WebPushSender webPushSender;
    private final AlarmPreferenceService alarmPreferenceService;
    private final PushSubscriptionService pushSubscriptionService;
    private final AlarmDispatchService alarmDispatchService;

    @Operation(summary = "VAPID 공개키 조회")
    @GetMapping("/vapid-public-key")
    public ResponseEntity<VapidPublicKeyResponse> vapidPublicKey(
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        if (!webPushSender.isReady() || webPushSender.publicKey() == null || webPushSender.publicKey().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "웹 푸시가 아직 설정되지 않았습니다.");
        }
        return ResponseEntity.ok(new VapidPublicKeyResponse(webPushSender.publicKey()));
    }

    @Operation(summary = "알람 설정 조회")
    @GetMapping("/preferences")
    public ResponseEntity<AlarmPreferenceDto> getPreferences(
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return ResponseEntity.ok(alarmPreferenceService.getPreferences(userDetails.getUsername()));
    }

    @Operation(summary = "알람 설정 저장 (신청 마감 요일은 금·토·일 고정, 시각만 변경)")
    @PutMapping("/preferences")
    public ResponseEntity<AlarmPreferenceDto> putPreferences(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AlarmPreferenceDto dto) {
        requireAuth(userDetails);
        return ResponseEntity.ok(alarmPreferenceService.updatePreferences(userDetails.getUsername(), dto));
    }

    @Operation(summary = "웹 푸시 구독 등록/갱신 (기기별, endpoint upsert)")
    @PostMapping("/subscriptions")
    public ResponseEntity<Map<String, String>> upsertSubscription(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PushSubscriptionRequestDto dto,
            HttpServletRequest request) {
        requireAuth(userDetails);
        pushSubscriptionService.upsert(userDetails.getUsername(), dto, request.getHeader("User-Agent"));
        return ResponseEntity.ok(Map.of("message", "구독이 저장되었습니다."));
    }

    @Operation(summary = "현재 기기 구독 해제 (endpoint 필수)")
    @DeleteMapping("/subscriptions")
    public ResponseEntity<Map<String, String>> deleteSubscription(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) Map<String, String> body,
            @RequestParam(required = false) String endpoint) {
        requireAuth(userDetails);
        String ep = endpoint;
        if ((ep == null || ep.isBlank()) && body != null) {
            ep = body.get("endpoint");
        }
        pushSubscriptionService.deleteByEndpoint(userDetails.getUsername(), ep);
        return ResponseEntity.ok(Map.of("message", "구독이 삭제되었습니다."));
    }

    @Operation(summary = "계정 전체 구독 삭제 (알람 마스터 OFF)")
    @DeleteMapping("/subscriptions/all")
    public ResponseEntity<Map<String, String>> deleteAllSubscriptions(
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        pushSubscriptionService.deleteAllForUser(userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "계정의 모든 구독이 삭제되었습니다."));
    }

    @Operation(summary = "테스트 알람 발송 (본인 구독만, dedupe 없음)")
    @PostMapping("/test")
    public ResponseEntity<Map<String, String>> sendTest(
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        alarmDispatchService.sendTestPush(userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "테스트 알람을 발송했습니다."));
    }

    private void requireAuth(UserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
    }
}
