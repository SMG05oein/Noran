package com.recode.Dwaeji.system.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
public class SystemController {

    private static final String STORAGE_DIR = "storage";
    private static final String HOW_TO_USE_FILE = "how-to-use.html";

    @Operation(summary = "이용방법 조회", description = "파일 시스템에 저장된 이용방법 내용을 조회합니다.")
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
        response.put("content", content);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "이용방법 저장", description = "이용방법 내용을 파일 시스템에 저장(덮어쓰기)합니다.")
    @PostMapping("/how-to-use")
    public ResponseEntity<Map<String, String>> saveHowToUse(@RequestBody SystemContentDto request) {
        try {
            File dir = new File(STORAGE_DIR);
            if (!dir.exists()) {
                dir.mkdirs();
            }
            Path path = Paths.get(STORAGE_DIR, HOW_TO_USE_FILE);
            Files.writeString(path, request.getContent() != null ? request.getContent() : "", StandardCharsets.UTF_8);
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
}

@Data
class SystemContentDto {
    private String content;
}
