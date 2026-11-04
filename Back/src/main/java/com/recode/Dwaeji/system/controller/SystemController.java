package com.recode.Dwaeji.system.controller;

import com.recode.Dwaeji.common.util.HtmlSanitizer;
import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@Tag(name = "시스템 관리", description = "시스템 공통 및 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
public class SystemController {

    private static final String STORAGE_DIR = "storage";
    private static final String HOW_TO_USE_FILE = "how-to-use.html";

    private final UserRepository userRepository;

    @Operation(summary = "이용방법 조회", description = "파일 시스템에 저장된 이용방법 내용을 조회합니다. 응답 시 HTML을 살균합니다.")
    @GetMapping("/how-to-use")
    public ResponseEntity<Map<String, String>> getHowToUse() {
        String content = "";
        try {
            Path path = Paths.get(STORAGE_DIR, HOW_TO_USE_FILE);
            if (Files.exists(path)) {
                content = Files.readString(path, StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.error("이용방법 조회 중 오류 발생", e);
        }

        Map<String, String> response = new HashMap<>();
        // 이미 저장된 악성 HTML이 있어도 응답 시 제거
        response.put("content", HtmlSanitizer.sanitize(content));
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "이용방법 저장", description = "관리자만 저장 가능. HTML은 저장 전 살균합니다.")
    @PostMapping("/how-to-use")
    public ResponseEntity<Map<String, String>> saveHowToUse(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SystemContentDto request) {
        requireAdmin(userDetails);

        try {
            File dir = new File(STORAGE_DIR);
            if (!dir.exists()) {
                dir.mkdirs();
            }
            Path path = Paths.get(STORAGE_DIR, HOW_TO_USE_FILE);
            String sanitized = HtmlSanitizer.sanitize(request.getContent());
            Files.writeString(path, sanitized, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("이용방법 저장 중 오류 발생", e);
            Map<String, String> response = new HashMap<>();
            response.put("error", "Failed to save file.");
            return ResponseEntity.internalServerError().body(response);
        }

        Map<String, String> response = new HashMap<>();
        response.put("message", "성공적으로 저장되었습니다.");
        return ResponseEntity.ok(response);
    }

    private void requireAdmin(UserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        User user = userRepository.findByUserId(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        Integer isAdmin = user.getUserType() != null ? user.getUserType().getUtIsAdmin() : null;
        if (isAdmin == null || isAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 이용방법을 저장할 수 있습니다.");
        }
    }
}

@Data
class SystemContentDto {
    private String content;
}
