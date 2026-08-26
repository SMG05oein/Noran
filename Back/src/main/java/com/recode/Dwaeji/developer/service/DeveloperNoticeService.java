package com.recode.Dwaeji.developer.service;

import com.recode.Dwaeji.developer.database.Announcement;
import com.recode.Dwaeji.developer.database.AnnouncementRepository;
import com.recode.Dwaeji.developer.dto.AnnouncementCreateRequestDto;
import com.recode.Dwaeji.developer.dto.AnnouncementListResponseDto;
import com.recode.Dwaeji.developer.dto.AnnouncementResponseDto;
import com.recode.Dwaeji.developer.dto.MaintenanceToggleRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeveloperNoticeService {

    private final AnnouncementRepository announcementRepository;
    private final AtomicBoolean maintenanceMode = new AtomicBoolean(false);

    // [개발자용] 전체 공지사항 목록 및 점검모드 상태 조회
    @Transactional(readOnly = true)
    public AnnouncementListResponseDto getAnnouncementsAndMaintenance() {
        List<AnnouncementResponseDto> notices = announcementRepository.findAllByOrderByAnnIdxDesc()
                .stream()
                .map(AnnouncementResponseDto::from)
                .collect(Collectors.toList());

        return AnnouncementListResponseDto.builder()
                .maintenanceMode(maintenanceMode.get())
                .notices(notices)
                .build();
    }

    // [공개용] 활성화(isActive == 1)된 공지사항 목록만 조회
    @Transactional(readOnly = true)
    public List<AnnouncementResponseDto> getPublicAnnouncements() {
        return announcementRepository.findAllByOrderByAnnIdxDesc()
                .stream()
                .filter(ann -> ann.getAnnIsActive() != null && ann.getAnnIsActive() == 1)
                .map(AnnouncementResponseDto::from)
                .collect(Collectors.toList());
    }

    // [공개용] 현재 점검 모드 상태만 조회
    public boolean isMaintenanceMode() {
        return maintenanceMode.get();
    }

    @Transactional
    public AnnouncementResponseDto createAnnouncement(AnnouncementCreateRequestDto request) {
        int isActive = (request.getIsActive() == null || request.getIsActive()) ? 1 : 0;

        Announcement announcement = Announcement.builder()
                .annTitle(request.getTitle())
                .annContent(request.getContent())
                .annIsActive(isActive)
                .build();

        Announcement saved = announcementRepository.save(announcement);
        return AnnouncementResponseDto.from(saved);
    }

    @Transactional
    public AnnouncementResponseDto toggleAnnouncementActive(Long id) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다."));

        int newStatus = (announcement.getAnnIsActive() != null && announcement.getAnnIsActive() == 1) ? 0 : 1;
        announcement.setAnnIsActive(newStatus);
        Announcement updated = announcementRepository.save(announcement);

        return AnnouncementResponseDto.from(updated);
    }

    @Transactional
    public void deleteAnnouncement(Long id) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다."));

        announcementRepository.delete(announcement);
    }

    public boolean setMaintenanceMode(MaintenanceToggleRequestDto request) {
        boolean enabled = request.getEnabled() != null && request.getEnabled();
        maintenanceMode.set(enabled);
        return enabled;
    }
}
