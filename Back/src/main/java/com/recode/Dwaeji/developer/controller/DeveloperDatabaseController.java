package com.recode.Dwaeji.developer.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dev/database")
@RequiredArgsConstructor
public class DeveloperDatabaseController {

    private final JdbcTemplate jdbcTemplate;

    @Value("${db.executor.id}")
    private String executorId;

    @Value("${db.executor.pw}")
    private String executorPw;

    @GetMapping("/schema")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<List<Map<String, Object>>> getDatabaseSchema() {
        try {
            // Get all tables
            List<String> tables = jdbcTemplate.queryForList("SHOW TABLES", String.class);
            List<Map<String, Object>> schema = new ArrayList<>();

            for (String table : tables) {
                Map<String, Object> tableInfo = new HashMap<>();
                tableInfo.put("tableName", table);
                
                // Get columns for each table
                List<Map<String, Object>> columns = jdbcTemplate.queryForList("DESCRIBE " + table);
                tableInfo.put("columns", columns);
                
                schema.add(tableInfo);
            }
            return ResponseEntity.ok(schema);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "스키마 조회 중 오류 발생: " + e.getMessage());
        }
    }

    @PostMapping("/query")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<?> executeQuery(@RequestBody Map<String, String> request) {
        String authId = request.get("id");
        String authPw = request.get("pw");
        String sql = request.get("sql");

        // 1. 2차 인증 검증
        if (authId == null || authPw == null || !authId.equals(executorId) || !authPw.equals(executorPw)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "쿼리 실행기 권한이 없습니다. (ID/PW 불일치)");
        }

        if (sql == null || sql.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "실행할 쿼리를 입력해주세요.");
        }

        try {
            String upperSql = sql.trim().toUpperCase();
            if (upperSql.startsWith("SELECT") || upperSql.startsWith("SHOW") || upperSql.startsWith("DESCRIBE")) {
                List<Map<String, Object>> result = jdbcTemplate.queryForList(sql);
                return ResponseEntity.ok(Map.of("type", "SELECT", "data", result));
            } else {
                int affectedRows = jdbcTemplate.update(sql);
                return ResponseEntity.ok(Map.of("type", "UPDATE", "affectedRows", affectedRows));
            }
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "쿼리 실행 중 오류 발생: " + e.getMessage());
        }
    }
}
