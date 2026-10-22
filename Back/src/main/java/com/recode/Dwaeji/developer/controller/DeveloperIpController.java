package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.database.AllowedIp;
import com.recode.Dwaeji.developer.database.AllowedIpRepository;
import com.recode.Dwaeji.developer.filter.DevIpAllowlistFilter;
import com.recode.Dwaeji.developer.service.DevIpAccessService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.InetAddress;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * IP management for the developer dashboard "IP" tab.
 * type = DEV (developer dashboard) | SERVICE (attendance service, dwaeji.kr)
 */
@RestController
@RequestMapping("/api/dev/ips")
@RequiredArgsConstructor
public class DeveloperIpController {

    private final AllowedIpRepository repository;
    private final DevIpAccessService accessService;

    public record AddRequest(String type, String ip, String memo, Boolean confirmEnable) {}

    @GetMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> list(HttpServletRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("myIp", DevIpAllowlistFilter.resolveClientIp(request));
        body.put("devConfigIps", accessService.getConfigIps().stream().sorted().toList());
        body.put("devIps", repository.findByIpTypeOrderByIpIdxAsc(AllowedIp.Type.DEV).stream().map(this::toMap).toList());
        body.put("serviceIps", repository.findByIpTypeOrderByIpIdxAsc(AllowedIp.Type.SERVICE).stream().map(this::toMap).toList());
        body.put("devRestrictionEnabled", !accessService.isAllowlistEmpty());
        body.put("serviceBlockEnabled", accessService.hasServiceBlocklist());
        return ResponseEntity.ok(body);
    }

    @PostMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> add(@RequestBody AddRequest req, HttpServletRequest request) {
        AllowedIp.Type type = parseType(req.type());
        String ip = normalizeIp(req.ip());
        String myIp = DevIpAllowlistFilter.resolveClientIp(request);

        if (repository.existsByIpTypeAndIpAddress(type, ip)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 IP입니다.");
        }
        if (type == AllowedIp.Type.DEV && accessService.isAllowlistEmpty() && !ip.equals(myIp)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "허용 IP가 처음 등록되면 제한이 활성화됩니다. 먼저 현재 접속 IP(" + myIp + ")를 등록하세요.");
        }
        if (type == AllowedIp.Type.SERVICE
                && (ip.equals(myIp) || accessService.isProtectedFromBlock(ip))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "내 IP, 서버 내부(127.0.0.1), 개발자 허용 IP는 차단할 수 없습니다.");
        }

        AllowedIp saved = repository.save(AllowedIp.builder()
                .ipType(type)
                .ipAddress(ip)
                .ipMemo(req.memo() == null ? null : req.memo().trim())
                .ipCreatedBy(currentUser())
                .ipCreatedAt(LocalDateTime.now())
                .build());
        accessService.reload();
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id, HttpServletRequest request) {
        AllowedIp target = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 항목입니다."));
        String myIp = DevIpAllowlistFilter.resolveClientIp(request);
        if (target.getIpType() == AllowedIp.Type.DEV && target.getIpAddress().equals(myIp)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 접속 중인 IP는 삭제할 수 없습니다.");
        }
        repository.delete(target);
        accessService.reload();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("deleted", id);
        body.put("serviceBlockEnabled", accessService.hasServiceBlocklist());
        return ResponseEntity.ok(body);
    }

    // ---------------- helpers ----------------

    private AllowedIp.Type parseType(String type) {
        try {
            return AllowedIp.Type.valueOf(type == null ? "" : type.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type must be DEV or SERVICE");
        }
    }

    private String normalizeIp(String raw) {
        String ip = raw == null ? "" : raw.trim();
        if (ip.isEmpty() || ip.length() > 64 || !ip.matches("[0-9a-fA-F:.]+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바른 IP 형식이 아닙니다.");
        }
        try {
            // literal only (no DNS lookup because of the character check above)
            return InetAddress.getByName(ip).getHostAddress().equals(ip) ? ip : ip.toLowerCase();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바른 IP 형식이 아닙니다.");
        }
    }

    private String currentUser() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return a == null ? null : a.getName();
    }

    private Map<String, Object> toMap(AllowedIp e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getIpIdx());
        m.put("type", e.getIpType().name());
        m.put("ip", e.getIpAddress());
        m.put("memo", e.getIpMemo());
        m.put("createdBy", e.getIpCreatedBy());
        m.put("createdAt", e.getIpCreatedAt());
        return m;
    }
}
