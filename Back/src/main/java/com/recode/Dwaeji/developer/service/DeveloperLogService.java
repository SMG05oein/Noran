package com.recode.Dwaeji.developer.service;

import com.recode.Dwaeji.developer.dto.LogResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Deque;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DeveloperLogService {

    private final Environment environment;

    public LogResponseDto getRecentLogs(int lines) {
        if (lines <= 0) {
            lines = 200;
        }

        // 1. 프로필 체크 (prod 프로필이 활성화되어 있지 않은 경우 안전한 비활성 응답)
        List<String> activeProfiles = Arrays.asList(environment.getActiveProfiles());
        if (!activeProfiles.contains("prod")) {
            return LogResponseDto.builder()
                    .available(false)
                    .message("로컬 개발 환경에서는 로그 파일 출력이 비활성화되어 있습니다.")
                    .logs(Collections.emptyList())
                    .totalLines(0)
                    .build();
        }

        // 2. 로그 파일 경로 탐색
        String[] candidatePaths = {
                "/home/MinJava/build/libs/app.log",
                "./logs/app.log",
                "./app.log"
        };

        File logFile = null;
        for (String path : candidatePaths) {
            File file = new File(path);
            if (file.exists() && file.isFile()) {
                logFile = file;
                break;
            }
        }

        if (logFile == null) {
            return LogResponseDto.builder()
                    .available(false)
                    .message("로그 파일을 찾을 수 없습니다.")
                    .logs(Collections.emptyList())
                    .totalLines(0)
                    .build();
        }

        // 3. Ring Buffer(Deque)를 사용해 메모리 효율적으로 하위 N줄만 추출
        Deque<String> buffer = new ArrayDeque<>(lines);
        try (BufferedReader reader = new BufferedReader(new FileReader(logFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (buffer.size() >= lines) {
                    buffer.pollFirst();
                }
                buffer.addLast(line);
            }
        } catch (Exception e) {
            return LogResponseDto.builder()
                    .available(false)
                    .message("로그 파일 읽기 중 오류 발생: " + e.getMessage())
                    .logs(Collections.emptyList())
                    .totalLines(0)
                    .build();
        }

        List<String> logs = new ArrayList<>(buffer);
        return LogResponseDto.builder()
                .available(true)
                .message("성공적으로 로그를 조회했습니다.")
                .logs(logs)
                .totalLines(logs.size())
                .build();
    }
}
