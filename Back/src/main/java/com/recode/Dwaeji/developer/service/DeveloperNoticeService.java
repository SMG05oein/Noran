package com.recode.Dwaeji.developer.service;

import com.recode.Dwaeji.developer.database.Announcement;
import com.recode.Dwaeji.developer.database.AnnouncementRepository;
import com.recode.Dwaeji.developer.dto.AnnouncementCreateRequestDto;
import com.recode.Dwaeji.developer.dto.AnnouncementListResponseDto;
import com.recode.Dwaeji.developer.dto.AnnouncementResponseDto;
import com.recode.Dwaeji.developer.dto.MaintenanceToggleRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeveloperNoticeService {

    static final String REDIS_MAINTENANCE = "ops:maintenance";
    private static final String F_IMMEDIATE = "immediate";
    private static final String F_MESSAGE = "message";
    private static final String F_START = "scheduledStart";
    private static final String F_END = "scheduledEnd";

    private final AnnouncementRepository announcementRepository;
    private final StringRedisTemplate redis;

    private static Instant parseInstant(String iso) {
        if (iso == null || iso.isBlank()) return null;
        try {
            return Instant.parse(iso);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid ISO-8601 datetime: " + iso);
        }
    }

    @Transactional(readOnly = true)
    public AnnouncementListResponseDto getAnnouncementsAndMaintenance() {
        List<AnnouncementResponseDto> notices = announcementRepository.findAllByOrderByAnnIdxDesc()
                .stream()
                .map(AnnouncementResponseDto::from)
                .collect(Collectors.toList());

        Map<String, Object> status = maintenanceStatusMap();
        return AnnouncementListResponseDto.builder()
                .maintenanceMode((Boolean) status.get("maintenanceMode"))
                .message((String) status.get("message"))
                .scheduledStart((String) status.get("scheduledStart"))
                .scheduledEnd((String) status.get("scheduledEnd"))
                .notices(notices)
                .build();
    }

    @Transactional(readOnly = true)
    public List<AnnouncementResponseDto> getPublicAnnouncements() {
        java.time.LocalDate today = java.time.LocalDate.now();
        return announcementRepository.findAllByOrderByAnnIdxDesc()
                .stream()
                .filter(ann -> ann.getAnnIsActive() != null && ann.getAnnIsActive() == 1)
                .filter(ann -> ann.getAnnStartDate() == null || !today.isBefore(ann.getAnnStartDate()))
                .filter(ann -> ann.getAnnEndDate() == null || !today.isAfter(ann.getAnnEndDate()))
                .map(AnnouncementResponseDto::from)
                .collect(Collectors.toList());
    }

    public boolean isMaintenanceMode() {
        return computeActive();
    }

    public Map<String, Object> maintenanceStatusMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("maintenanceMode", computeActive());
        m.put("message", blankToNull(hget(F_MESSAGE)));
        String s = blankToNull(hget(F_START));
        String e = blankToNull(hget(F_END));
        m.put("scheduledStart", s);
        m.put("scheduledEnd", e);
        return m;
    }

    @Transactional
    public AnnouncementResponseDto createAnnouncement(AnnouncementCreateRequestDto request) {
        int isActive = (request.getIsActive() == null || request.getIsActive()) ? 1 : 0;
        Announcement announcement = Announcement.builder()
                .annTitle(request.getTitle())
                .annContent(request.getContent())
                .annIsActive(isActive)
                .annStartDate(request.getStartDate())
                .annEndDate(request.getEndDate())
                .build();
        return AnnouncementResponseDto.from(announcementRepository.save(announcement));
    }

    @Transactional
    public AnnouncementResponseDto updateAnnouncement(Long id, AnnouncementCreateRequestDto request) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다."));
        announcement.setAnnTitle(request.getTitle());
        announcement.setAnnContent(request.getContent());
        if (request.getIsActive() != null) {
            announcement.setAnnIsActive(request.getIsActive() ? 1 : 0);
        }
        announcement.setAnnStartDate(request.getStartDate());
        announcement.setAnnEndDate(request.getEndDate());
        return AnnouncementResponseDto.from(announcementRepository.save(announcement));
    }

    @Transactional
    public AnnouncementResponseDto toggleAnnouncementActive(Long id) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다."));
        int newStatus = (announcement.getAnnIsActive() != null && announcement.getAnnIsActive() == 1) ? 0 : 1;
        announcement.setAnnIsActive(newStatus);
        return AnnouncementResponseDto.from(announcementRepository.save(announcement));
    }

    @Transactional
    public void deleteAnnouncement(Long id) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다."));
        announcementRepository.delete(announcement);
    }

    public Map<String, Object> setMaintenanceMode(MaintenanceToggleRequestDto request) {
        boolean enabled = request.getEnabled() != null && request.getEnabled();
        hset(F_IMMEDIATE, enabled ? "true" : "false");
        if (request.getMessage() != null) {
            if (request.getMessage().isBlank()) {
                redis.opsForHash().delete(REDIS_MAINTENANCE, F_MESSAGE);
            } else {
                hset(F_MESSAGE, request.getMessage());
            }
        }

        Instant start = parseInstant(request.getScheduledStart());
        Instant end = parseInstant(request.getScheduledEnd());
        if (start != null || end != null) {
            if (start != null) {
                hset(F_START, start.toString());
            } else {
                redis.opsForHash().delete(REDIS_MAINTENANCE, F_START);
            }
            if (end != null) {
                hset(F_END, end.toString());
            } else {
                redis.opsForHash().delete(REDIS_MAINTENANCE, F_END);
            }
        } else if (!enabled) {
            redis.opsForHash().delete(REDIS_MAINTENANCE, F_START, F_END);
            if (request.getMessage() == null || request.getMessage().isBlank()) {
                redis.opsForHash().delete(REDIS_MAINTENANCE, F_MESSAGE);
            }
        }

        return maintenanceStatusMap();
    }

    /**
     * Ensure schedule window flips immediate flag for observability (optional).
     */
    @Scheduled(fixedDelayString = "${alert.check-ms:60000}")
    public void refreshScheduleFlag() {
        Instant end = parseStoredInstant(hget(F_END));
        Instant start = parseStoredInstant(hget(F_START));
        if (start != null && end != null) {
            Instant now = Instant.now();
            if (now.isAfter(end) && "true".equals(hget(F_IMMEDIATE))) {
                // scheduled window ended — do not auto-clear immediate intentional ON
            }
        }
    }

    private boolean computeActive() {
        if ("true".equals(hget(F_IMMEDIATE))) {
            return true;
        }
        Instant start = parseStoredInstant(hget(F_START));
        Instant end = parseStoredInstant(hget(F_END));
        if (start == null && end == null) {
            return false;
        }
        Instant now = Instant.now();
        boolean afterStart = start == null || !now.isBefore(start);
        boolean beforeEnd = end == null || !now.isAfter(end);
        return afterStart && beforeEnd;
    }

    private String hget(String field) {
        Object v = redis.opsForHash().get(REDIS_MAINTENANCE, field);
        return v != null ? v.toString() : null;
    }

    private void hset(String field, String value) {
        redis.opsForHash().put(REDIS_MAINTENANCE, field, value);
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private static Instant parseStoredInstant(String iso) {
        if (iso == null || iso.isBlank()) return null;
        try {
            return Instant.parse(iso);
        } catch (Exception e) {
            return null;
        }
    }
}
