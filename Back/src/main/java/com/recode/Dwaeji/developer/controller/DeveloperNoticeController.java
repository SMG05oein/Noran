package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.dto.AnnouncementCreateRequestDto;
import com.recode.Dwaeji.developer.dto.AnnouncementListResponseDto;
import com.recode.Dwaeji.developer.dto.AnnouncementResponseDto;
import com.recode.Dwaeji.developer.dto.MaintenanceToggleRequestDto;
import com.recode.Dwaeji.developer.service.DeveloperNoticeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dev/announcements")
@RequiredArgsConstructor
public class DeveloperNoticeController {

    private final DeveloperNoticeService developerNoticeService;

    // 🌟 [공개용 API 1] 점검 모드 전용 상태 확인 (누구나 호출 가능)
    @GetMapping("/maintenance-status")
    public ResponseEntity<Map<String, Boolean>> getMaintenanceStatus() {
        boolean maintenanceMode = developerNoticeService.isMaintenanceMode();
        return ResponseEntity.ok(Map.of("maintenanceMode", maintenanceMode));
    }

    // 🌟 [공개용 API 2] 활성화된 공지사항 전용 목록 조회 (누구나 호출 가능)
    @GetMapping("/public")
    public ResponseEntity<List<AnnouncementResponseDto>> getPublicAnnouncements() {
        List<AnnouncementResponseDto> response = developerNoticeService.getPublicAnnouncements();
        return ResponseEntity.ok(response);
    }

    // 🔒 [개발자용 API] 전체 공지사항 및 점검모드 상태 통합 조회 (ROLE_DEVELOPER 필요)
    @GetMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<AnnouncementListResponseDto> getAnnouncements() {
        AnnouncementListResponseDto response = developerNoticeService.getAnnouncementsAndMaintenance();
        return ResponseEntity.ok(response);
    }

    // 🔒 [개발자용 API] 공지사항 작성
    @PostMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<AnnouncementResponseDto> createAnnouncement(@Valid @RequestBody AnnouncementCreateRequestDto request) {
        AnnouncementResponseDto response = developerNoticeService.createAnnouncement(request);
        return ResponseEntity.ok(response);
    }

    // 🔒 [개발자용 API] 공지사항 활성/비활성 토글
    @PutMapping("/{id}/toggle")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<AnnouncementResponseDto> toggleAnnouncement(@PathVariable Long id) {
        AnnouncementResponseDto response = developerNoticeService.toggleAnnouncementActive(id);
        return ResponseEntity.ok(response);
    }

    // 🔒 [개발자용 API] 공지사항 삭제
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<String> deleteAnnouncement(@PathVariable Long id) {
        developerNoticeService.deleteAnnouncement(id);
        return ResponseEntity.ok("공지사항이 삭제되었습니다.");
    }

    // 🔒 [개발자용 API] 서비스 점검 모드 설정 토글
    @PostMapping("/maintenance")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Boolean>> toggleMaintenance(@Valid @RequestBody MaintenanceToggleRequestDto request) {
        boolean enabled = developerNoticeService.setMaintenanceMode(request);
        return ResponseEntity.ok(Map.of("maintenanceMode", enabled));
    }
}
