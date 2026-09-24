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

    @GetMapping("/maintenance-status")
    public ResponseEntity<Map<String, Object>> getMaintenanceStatus() {
        return ResponseEntity.ok(developerNoticeService.maintenanceStatusMap());
    }

    @GetMapping("/public")
    public ResponseEntity<List<AnnouncementResponseDto>> getPublicAnnouncements() {
        return ResponseEntity.ok(developerNoticeService.getPublicAnnouncements());
    }

    @GetMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<AnnouncementListResponseDto> getAnnouncements() {
        return ResponseEntity.ok(developerNoticeService.getAnnouncementsAndMaintenance());
    }

    @PostMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<AnnouncementResponseDto> createAnnouncement(@Valid @RequestBody AnnouncementCreateRequestDto request) {
        return ResponseEntity.ok(developerNoticeService.createAnnouncement(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<AnnouncementResponseDto> updateAnnouncement(
            @PathVariable Long id,
            @Valid @RequestBody AnnouncementCreateRequestDto request) {
        return ResponseEntity.ok(developerNoticeService.updateAnnouncement(id, request));
    }

    @PutMapping("/{id}/toggle")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<AnnouncementResponseDto> toggleAnnouncement(@PathVariable Long id) {
        return ResponseEntity.ok(developerNoticeService.toggleAnnouncementActive(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<String> deleteAnnouncement(@PathVariable Long id) {
        developerNoticeService.deleteAnnouncement(id);
        return ResponseEntity.ok("공지사항이 삭제되었습니다.");
    }

    @PostMapping("/maintenance")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> toggleMaintenance(@Valid @RequestBody MaintenanceToggleRequestDto request) {
        return ResponseEntity.ok(developerNoticeService.setMaintenanceMode(request));
    }
}
