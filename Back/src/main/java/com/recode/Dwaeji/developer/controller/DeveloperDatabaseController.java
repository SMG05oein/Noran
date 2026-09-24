package com.recode.Dwaeji.developer.controller;

import com.recode.Dwaeji.developer.dto.DevSqlQueryRequestDto;
import com.recode.Dwaeji.developer.service.DevAuditService;
import com.recode.Dwaeji.developer.service.DevExecutorAuth;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
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
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/dev/database")
@RequiredArgsConstructor
public class DeveloperDatabaseController {

    private static final Pattern DANGEROUS = Pattern.compile(
            "\\b(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|DELETE\\s+FROM|INSERT\\s+INTO|UPDATE\\s+)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private final JdbcTemplate jdbcTemplate;
    private final DevExecutorAuth executorAuth;
    private final DevAuditService auditService;

    @GetMapping("/schema")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<List<Map<String, Object>>> getDatabaseSchema() {
        try {
            List<String> tables = jdbcTemplate.queryForList("SHOW TABLES", String.class);
            List<Map<String, Object>> schema = new ArrayList<>();
            for (String table : tables) {
                Map<String, Object> tableInfo = new HashMap<>();
                tableInfo.put("tableName", table);
                List<Map<String, Object>> columns = jdbcTemplate.queryForList("DESCRIBE `" + table.replace("`", "") + "`");
                tableInfo.put("columns", columns);
                schema.add(tableInfo);
            }
            return ResponseEntity.ok(schema);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "스키마 조회 중 오류 발생: " + e.getMessage());
        }
    }

    @GetMapping("/audit")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<List<Map<String, Object>>> getAudit(@RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(auditService.list(limit, "database"));
    }

    @PostMapping("/query")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<?> executeQuery(@RequestBody DevSqlQueryRequestDto request, HttpServletRequest http) {
        executorAuth.require(request.getId(), request.getPw());
        String sql = request.getSql();
        String ip = clientIp(http);
        String executor = request.getId();

        if (sql == null || sql.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "실행할 쿼리를 입력해주세요.");
        }

        boolean readOnly = request.getReadOnly() == null || Boolean.TRUE.equals(request.getReadOnly());
        boolean confirmDangerous = Boolean.TRUE.equals(request.getConfirmDangerous());
        String trimmed = sql.trim();
        String upper = trimmed.toUpperCase();
        boolean isRead = upper.startsWith("SELECT") || upper.startsWith("SHOW")
                || upper.startsWith("DESCRIBE") || upper.startsWith("DESC") || upper.startsWith("EXPLAIN");

        if (readOnly && !isRead) {
            auditService.recordSql(executor, sql, "BLOCKED", false, "readOnly=true blocks non-SELECT", null, ip);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "readOnly=true 에서는 SELECT/SHOW/DESCRIBE/EXPLAIN 만 허용됩니다.");
        }

        boolean dangerous = DANGEROUS.matcher(trimmed).find();
        if (dangerous && !confirmDangerous) {
            auditService.recordSql(executor, sql, "BLOCKED", false, "confirmDangerous required", null, ip);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "위험한 SQL입니다. confirmDangerous=true 가 필요합니다.");
        }

        try {
            if (isRead) {
                List<Map<String, Object>> result = jdbcTemplate.queryForList(sql);
                auditService.recordSql(executor, sql, "SELECT", true, "ok", result.size(), ip);
                return ResponseEntity.ok(Map.of("type", "SELECT", "data", result));
            } else {
                int affectedRows = jdbcTemplate.update(sql);
                auditService.recordSql(executor, sql, "UPDATE", true, "ok", affectedRows, ip);
                return ResponseEntity.ok(Map.of("type", "UPDATE", "affectedRows", affectedRows));
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            auditService.recordSql(executor, sql, isRead ? "SELECT" : "UPDATE", false, e.getMessage(), null, ip);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "쿼리 실행 중 오류 발생: " + e.getMessage());
        }
    }

    private static String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
