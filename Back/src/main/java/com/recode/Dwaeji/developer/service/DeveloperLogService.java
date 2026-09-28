package com.recode.Dwaeji.developer.service;

import com.recode.Dwaeji.developer.dto.LogResponseDto;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DeveloperLogService {

    public LogResponseDto getRecentLogs(int lines, String level, String keyword) {
        if (lines <= 0) {
            lines = 200;
        }

        File logFile = findLogFile();
        if (logFile == null) {
            return LogResponseDto.builder()
                    .available(false)
                    .message("로그 파일(app.log)을 찾을 수 없습니다.")
                    .logs(Collections.emptyList())
                    .totalLines(0)
                    .matchedLines(0)
                    .filtered(false)
                    .build();
        }

        // Read a larger window then filter, so filters still return up to `lines` matches.
        int readWindow = Math.max(lines * 20, lines);
        Deque<String> buffer = new ArrayDeque<>(readWindow);
        try (BufferedReader reader = new BufferedReader(new FileReader(logFile, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (buffer.size() >= readWindow) {
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
                    .matchedLines(0)
                    .filtered(false)
                    .build();
        }

        List<String> raw = new ArrayList<>(buffer);
        boolean hasFilter = (level != null && !level.isBlank()) || (keyword != null && !keyword.isBlank());
        List<String> filtered = raw.stream()
                .filter(l -> matchLevel(l, level))
                .filter(l -> matchKeyword(l, keyword))
                .collect(Collectors.toList());

        int matched = filtered.size();
        List<String> out = filtered;
        if (out.size() > lines) {
            out = out.subList(out.size() - lines, out.size());
        }

        return LogResponseDto.builder()
                .available(true)
                .message("성공적으로 로그를 조회했습니다.")
                .logs(out)
                .totalLines(out.size())
                .matchedLines(matched)
                .filtered(hasFilter)
                .build();
    }

    public File findLogFile() {
        String[] candidatePaths = {
                "/home/MinJava/build/libs/app.log",
                "./logs/app.log",
                "./app.log"
        };
        for (String path : candidatePaths) {
            File file = new File(path);
            if (file.exists() && file.isFile()) {
                return file;
            }
        }
        return null;
    }

    private static boolean matchLevel(String line, String level) {
        if (level == null || level.isBlank()) return true;
        String lv = level.trim().toUpperCase(Locale.ROOT);
        String upper = line.toUpperCase(Locale.ROOT);
        return upper.contains(" " + lv + " ") || upper.contains("[" + lv + "]") || upper.contains(" " + lv + ":");
    }

    private static boolean matchKeyword(String line, String keyword) {
        if (keyword == null || keyword.isBlank()) return true;
        return line.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT));
    }
}
