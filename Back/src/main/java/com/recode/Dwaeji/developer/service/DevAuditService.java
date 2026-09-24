package com.recode.Dwaeji.developer.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;

/** In-memory audit ring for destructive / privileged dev actions. */
@Service
public class DevAuditService {

    private static final int MAX = 200;
    private final ConcurrentLinkedDeque<Map<String, Object>> entries = new ConcurrentLinkedDeque<>();
    private final AtomicLong seq = new AtomicLong(1);

    /** DB query audit shape expected by Front. */
    public void recordSql(String executorId, String sql, String type, boolean success, String message, Integer affectedRows, String clientIp) {
        Map<String, Object> row = new java.util.LinkedHashMap<>();
        row.put("id", seq.getAndIncrement());
        row.put("category", "database");
        row.put("executorId", executorId != null ? executorId : "unknown");
        row.put("sqlPreview", truncate(sql, 500));
        row.put("type", type != null ? type : "UNKNOWN");
        row.put("success", success);
        row.put("message", message != null ? message : "");
        if (affectedRows != null) {
            row.put("affectedRows", affectedRows);
        }
        row.put("timestamp", Instant.now().toString());
        row.put("clientIp", clientIp != null ? clientIp : "");
        entries.addFirst(row);
        while (entries.size() > MAX) {
            entries.removeLast();
        }
    }

    public void record(String category, String actor, String detail, boolean success, String message, String clientIp) {
        Map<String, Object> row = new java.util.LinkedHashMap<>();
        row.put("id", seq.getAndIncrement());
        row.put("category", category != null ? category : "unknown");
        row.put("actor", actor != null ? actor : "unknown");
        row.put("detail", truncate(detail, 500));
        row.put("success", success);
        row.put("message", message != null ? message : "");
        row.put("clientIp", clientIp != null ? clientIp : "");
        row.put("timestamp", Instant.now().toString());
        entries.addFirst(row);
        while (entries.size() > MAX) {
            entries.removeLast();
        }
    }

    public List<Map<String, Object>> list(int limit, String categoryOrNull) {
        int n = Math.max(1, Math.min(limit, MAX));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> e : entries) {
            if (categoryOrNull != null && !categoryOrNull.equals(String.valueOf(e.get("category")))) {
                continue;
            }
            out.add(e);
            if (out.size() >= n) break;
        }
        return out;
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }
}
