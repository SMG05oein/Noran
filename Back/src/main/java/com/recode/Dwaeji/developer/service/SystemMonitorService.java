package com.recode.Dwaeji.developer.service;

import com.recode.Dwaeji.developer.dto.TopEndpointDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SystemMonitorService {

    static final String REDIS_TRAFFIC = "ops:traffic";
    static final String REDIS_ERRORS = "ops:errors";
    static final String REDIS_ERROR_SEQ = "ops:error:seq";
    static final String REDIS_CALLS = "ops:calls";
    static final String REDIS_EP_KEYS = "ops:ep:keys";
    private static final String EP_PREFIX = "ops:ep:";

    private static final int MAX_ERRORS = 100;
    private static final int MAX_CALL_SAMPLES = 20_000;
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final StringRedisTemplate redis;
    private final JsonMapper jsonMapper;

    @Autowired(required = false)
    private JavaMailSender mailSender;
    @Value("${spring.mail.username:}")
    private String alertEmailTo;
    /** Per-JVM previous snapshot for alert delta (not shared). */
    private long lastServerErrorCount = 0;

    public SystemMonitorService(StringRedisTemplate redis, JsonMapper jsonMapper) {
        this.redis = redis;
        this.jsonMapper = jsonMapper;
    }

    public void recordTraffic(int statusCode) {
        redis.opsForHash().increment(REDIS_TRAFFIC, "total", 1);
        if (statusCode >= 200 && statusCode < 300) {
            redis.opsForHash().increment(REDIS_TRAFFIC, "success", 1);
        } else if (statusCode >= 300 && statusCode < 400) {
            redis.opsForHash().increment(REDIS_TRAFFIC, "redirection", 1);
        } else if (statusCode == 404) {
            redis.opsForHash().increment(REDIS_TRAFFIC, "notFound", 1);
        } else if (statusCode == 429) {
            redis.opsForHash().increment(REDIS_TRAFFIC, "rateLimited", 1);
        } else if (statusCode >= 400 && statusCode < 500) {
            redis.opsForHash().increment(REDIS_TRAFFIC, "clientError", 1);
        } else if (statusCode >= 500) {
            redis.opsForHash().increment(REDIS_TRAFFIC, "serverError", 1);
        }
    }

    /**
     * Backward-compatible overload.
     */
    public void recordEndpointCall(String path, String method, long responseTimeMs) {
        recordEndpointCall(path, method, responseTimeMs, 0);
    }

    public void recordEndpointCall(String path, String method, long responseTimeMs, int statusCode) {
        if (path == null || method == null || path.startsWith("/api/dev/")) {
            return;
        }
        String m = method.toUpperCase();
        String key = m + " " + path;
        redis.opsForSet().add(REDIS_EP_KEYS, key);
        String epKey = EP_PREFIX + key;
        redis.opsForHash().increment(epKey, "count", 1);
        redis.opsForHash().increment(epKey, "totalMs", responseTimeMs);
        redis.opsForHash().put(epKey, "path", path);
        redis.opsForHash().put(epKey, "method", m);
        long prevMax = parseLong(redis.opsForHash().get(epKey, "maxMs"));
        if (responseTimeMs > prevMax) {
            redis.opsForHash().put(epKey, "maxMs", String.valueOf(responseTimeMs));
        }

        CallSample sample = new CallSample(Instant.now().toEpochMilli(), path, m, responseTimeMs, statusCode);
        try {
            redis.opsForList().leftPush(REDIS_CALLS, jsonMapper.writeValueAsString(sample));
            redis.opsForList().trim(REDIS_CALLS, 0, MAX_CALL_SAMPLES - 1);
        } catch (JacksonException ignored) {
            // skip sample on serialize failure
        }
    }

    public List<TopEndpointDto> getTopEndpoints() {
        return getTopEndpoints(null, 10);
    }

    public List<TopEndpointDto> getTopEndpoints(Integer hours, int limit) {
        if (hours == null) {
            return aggregateAllByCount(limit);
        }
        return aggregateWindow(hours, limit, false);
    }

    public List<TopEndpointDto> getSlowEndpoints(int hours, int limit) {
        return aggregateWindow(hours, limit, true);
    }

    public Map<String, Long> getStatusBreakdown(int hours) {
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(hours * 3600L);
        return countStatusesBetween(cutoff, now);
    }

    /**
     * Current window + previous equal window + deltas for Ops Console compare UI.
     */
    public Map<String, Object> getStatusBreakdownCompared(int hours) {
        int h = Math.max(1, hours);
        Instant now = Instant.now();
        Instant curStart = now.minusSeconds(h * 3600L);
        Instant prevStart = now.minusSeconds(h * 2L * 3600L);

        Map<String, Long> current = countStatusesBetween(curStart, now);
        Map<String, Long> previous = countStatusesBetween(prevStart, curStart);

        Map<String, Long> delta = new LinkedHashMap<>();
        for (String key : List.of("2xx", "3xx", "4xx", "5xx", "429", "total")) {
            long c = current.getOrDefault(key, 0L);
            long p = previous.getOrDefault(key, 0L);
            delta.put(key, c - p);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("hours", h);
        out.put("2xx", current.get("2xx"));
        out.put("3xx", current.get("3xx"));
        out.put("4xx", current.get("4xx"));
        out.put("5xx", current.get("5xx"));
        out.put("429", current.get("429"));
        out.put("total", current.get("total"));
        out.put("previous", previous);
        out.put("delta", delta);
        // All-time counters from Redis (not limited to call-sample window)
        out.put("lifetime", getLifetimeStatusBreakdown());
        return out;
    }

    /**
     * Lifetime status totals from {@code ops:traffic} (survives deploy; not time-windowed).
     */
    public Map<String, Long> getLifetimeStatusBreakdown() {
        Map<String, Long> traffic = getTrafficStats();
        long s2 = traffic.getOrDefault("success", 0L);
        long s3 = traffic.getOrDefault("redirection", 0L);
        long s4 = traffic.getOrDefault("notFound", 0L) + traffic.getOrDefault("clientError", 0L);
        long s5 = traffic.getOrDefault("serverError", 0L);
        long s429 = traffic.getOrDefault("rateLimited", 0L);
        long total = traffic.getOrDefault("total", 0L);
        Map<String, Long> m = new LinkedHashMap<>();
        m.put("2xx", s2);
        m.put("3xx", s3);
        m.put("4xx", s4);
        m.put("5xx", s5);
        m.put("429", s429);
        m.put("total", total);
        return m;
    }

    /**
     * Hourly buckets for simple traffic trend chart (oldest → newest).
     */
    public List<Map<String, Object>> getHourlyTrend(int hours) {
        int h = Math.min(168, Math.max(1, hours));
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(h * 3600L);

        long[] total = new long[h];
        long[] s5 = new long[h];
        long[] durationSum = new long[h];
        long[] durationCount = new long[h];

        for (CallSample s : loadCallSamples()) {
            Instant at = Instant.ofEpochMilli(s.at());
            if (at.isBefore(cutoff)) continue;
            long secAgo = Math.max(0, now.getEpochSecond() - at.getEpochSecond());
            int hoursAgo = (int) (secAgo / 3600);
            if (hoursAgo >= h) continue;
            int idx = h - 1 - hoursAgo;
            total[idx]++;
            if (s.statusCode() >= 500) s5[idx]++;
            durationSum[idx] += s.durationMs();
            durationCount[idx]++;
        }

        List<Map<String, Object>> list = new ArrayList<>(h);
        for (int i = 0; i < h; i++) {
            Map<String, Object> row = new LinkedHashMap<>();
            int hoursAgo = h - 1 - i;
            row.put("offsetHours", hoursAgo);
            row.put("label", hoursAgo == 0 ? "지금" : "-" + hoursAgo + "h");
            row.put("total", total[i]);
            row.put("s5xx", s5[i]);
            double avg = durationCount[i] > 0
                    ? Math.round((durationSum[i] * 100.0 / durationCount[i])) / 100.0
                    : 0;
            row.put("avgMs", avg);
            list.add(row);
        }
        return list;
    }

    private Map<String, Long> countStatusesBetween(Instant fromInclusive, Instant toExclusive) {
        long s2 = 0, s3 = 0, s4 = 0, s5 = 0, s429 = 0, total = 0;
        for (CallSample s : loadCallSamples()) {
            Instant at = Instant.ofEpochMilli(s.at());
            if (at.isBefore(fromInclusive) || !at.isBefore(toExclusive)) continue;
            total++;
            int c = s.statusCode();
            if (c == 429) s429++;
            else if (c >= 200 && c < 300) s2++;
            else if (c >= 300 && c < 400) s3++;
            else if (c >= 400 && c < 500) s4++;
            else if (c >= 500) s5++;
        }
        Map<String, Long> m = new LinkedHashMap<>();
        m.put("2xx", s2);
        m.put("3xx", s3);
        m.put("4xx", s4);
        m.put("5xx", s5);
        m.put("429", s429);
        m.put("total", total);
        return m;
    }

    /**
     * Server-error count for alert delta (lifetime counter).
     */
    public long getServerErrorCount() {
        return parseLong(redis.opsForHash().get(REDIS_TRAFFIC, "serverError"));
    }

    public double memoryUsedPercent() {
        long max = Runtime.getRuntime().maxMemory();
        long used = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        if (max <= 0) return 0;
        return used * 100.0 / max;
    }

    private List<TopEndpointDto> aggregateAllByCount(int limit) {
        Set<String> keys = redis.opsForSet().members(REDIS_EP_KEYS);
        if (keys == null || keys.isEmpty()) {
            return List.of();
        }
        List<TopEndpointDto> list = new ArrayList<>();
        for (String key : keys) {
            Map<Object, Object> h = redis.opsForHash().entries(EP_PREFIX + key);
            if (h == null || h.isEmpty()) continue;
            long c = parseLong(h.get("count"));
            long totalTime = parseLong(h.get("totalMs"));
            long max = parseLong(h.get("maxMs"));
            String path = Objects.toString(h.get("path"), key);
            String method = Objects.toString(h.get("method"), "");
            double avgTime = c > 0 ? (double) totalTime / c : 0.0;
            double roundedAvg = Math.round(avgTime * 100.0) / 100.0;
            list.add(TopEndpointDto.builder()
                    .path(path)
                    .method(method)
                    .count(c)
                    .avgResponseTimeMs(roundedAvg)
                    .maxResponseTimeMs(max)
                    .build());
        }
        list.sort(Comparator.comparingLong((TopEndpointDto d) ->
                d.getCount() != null ? d.getCount() : 0L).reversed());
        return list.stream().limit(Math.max(1, limit)).collect(Collectors.toList());
    }

    private List<TopEndpointDto> aggregateWindow(int hours, int limit, boolean byAvgDesc) {
        Instant cutoff = Instant.now().minusSeconds(Math.max(1, hours) * 3600L);
        Map<String, long[]> agg = new HashMap<>(); // count, totalMs, maxMs
        Map<String, String[]> meta = new HashMap<>();
        for (CallSample s : loadCallSamples()) {
            if (Instant.ofEpochMilli(s.at()).isBefore(cutoff)) continue;
            String key = s.method() + " " + s.path();
            meta.putIfAbsent(key, new String[]{s.path(), s.method()});
            long[] a = agg.computeIfAbsent(key, k -> new long[3]);
            a[0]++;
            a[1] += s.durationMs();
            a[2] = Math.max(a[2], s.durationMs());
        }
        List<TopEndpointDto> list = new ArrayList<>();
        for (Map.Entry<String, long[]> e : agg.entrySet()) {
            String[] m = meta.get(e.getKey());
            long c = e.getValue()[0];
            long total = e.getValue()[1];
            long max = e.getValue()[2];
            double avg = c > 0 ? Math.round((total * 100.0 / c)) / 100.0 : 0;
            list.add(TopEndpointDto.builder()
                    .path(m[0])
                    .method(m[1])
                    .count(c)
                    .avgResponseTimeMs(avg)
                    .maxResponseTimeMs(max)
                    .build());
        }
        if (byAvgDesc) {
            list.sort(Comparator.comparingDouble((TopEndpointDto d) ->
                    d.getAvgResponseTimeMs() != null ? d.getAvgResponseTimeMs() : 0).reversed());
        } else {
            list.sort(Comparator.comparingLong((TopEndpointDto d) ->
                    d.getCount() != null ? d.getCount() : 0L).reversed());
        }
        return list.stream().limit(Math.max(1, limit)).collect(Collectors.toList());
    }

    public void addErrorLog(String errorMessage, String exceptionType, String requestUrl, String apiPath, String who, int httpCode, String referer, String clientIp) {
        Long no = redis.opsForValue().increment(REDIS_ERROR_SEQ);
        String ref = referer != null && !referer.isBlank() ? referer : "알 수 없음";
        Map<String, Object> errorLog = new LinkedHashMap<>();
        errorLog.put("no", no != null ? no : 1L);
        errorLog.put("timestamp", LocalDateTime.now().format(formatter));
        errorLog.put("message", errorMessage != null ? errorMessage : "No message");
        errorLog.put("type", exceptionType != null ? exceptionType : "Unknown");
        errorLog.put("httpCode", httpCode);
        errorLog.put("requestUrl", requestUrl != null ? requestUrl : "Unknown");
        errorLog.put("apiPath", apiPath != null ? apiPath : "Unknown");
        errorLog.put("who", who != null ? who : "로그인 전");
        errorLog.put("referer", ref);
        // Display: www.dwaeji.kr/dev/login (from Referer/Origin)
        errorLog.put("requestPage", toRequestPage(ref));
        errorLog.put("clientIp", clientIp != null ? clientIp : "Unknown");

        try {
            redis.opsForList().leftPush(REDIS_ERRORS, jsonMapper.writeValueAsString(errorLog));
            redis.opsForList().trim(REDIS_ERRORS, 0, MAX_ERRORS - 1);
        } catch (JacksonException ignored) {
            // skip on serialize failure
        }
    }

    public Map<String, Long> getTrafficStats() {
        Map<Object, Object> h = redis.opsForHash().entries(REDIS_TRAFFIC);
        return Map.of(
                "success", parseLong(h.get("success")),
                "redirection", parseLong(h.get("redirection")),
                "notFound", parseLong(h.get("notFound")),
                "clientError", parseLong(h.get("clientError")),
                "serverError", parseLong(h.get("serverError")),
                "rateLimited", parseLong(h.get("rateLimited")),
                "total", parseLong(h.get("total"))
        );
    }

    public Object[] getRecentErrors() {
        List<String> raw = redis.opsForList().range(REDIS_ERRORS, 0, MAX_ERRORS - 1);
        if (raw == null || raw.isEmpty()) {
            return new Object[0];
        }
        List<Map<String, Object>> out = new ArrayList<>(raw.size());
        for (String json : raw) {
            try {
                Map<String, Object> row = jsonMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
                if (!row.containsKey("requestPage")) {
                    row.put("requestPage", toRequestPage(Objects.toString(row.get("referer"), null)));
                }
                out.add(row);
            } catch (Exception ignored) {
                // skip bad entry
            }
        }
        return out.toArray();
    }

    /**
     * {@code https://www.dwaeji.kr/dev/login} → {@code www.dwaeji.kr/dev/login}
     */
    static String toRequestPage(String referer) {
        if (referer == null || referer.isBlank() || "알 수 없음".equals(referer)) {
            return "알 수 없음";
        }
        try {
            java.net.URI u = java.net.URI.create(referer.trim());
            String host = u.getHost();
            if (host == null || host.isBlank()) {
                return referer.replaceFirst("(?i)^https?://", "");
            }
            String path = u.getPath() != null ? u.getPath() : "";
            String query = (u.getQuery() != null && !u.getQuery().isBlank()) ? "?" + u.getQuery() : "";
            return host + path + query;
        } catch (Exception e) {
            return referer.replaceFirst("(?i)^https?://", "");
        }
    }

    @Scheduled(fixedRate = 60000) // 1분(60초)마다 서버 모니터링 및 알림 발송
    public void checkAndSendAlerts() {
        if (mailSender == null || alertEmailTo == null || alertEmailTo.isEmpty()) {
            return; // 메일 설정이 없으면 패스
        }

        double memoryUsed = memoryUsedPercent();
        long currentErrors = getServerErrorCount();
        long newErrors = currentErrors - lastServerErrorCount;

        // 메모리 85% 이상이거나 1분간 서버에러(500) 100회 이상 폭주 시
        if (memoryUsed > 85.0 || newErrors >= 100) {
            String subject = "🚨 [긴급] Dwaeji 서버 상태 위험 알림";
            String text = "현재 서버 상태가 위험 수준입니다.\n\n" +
                    "- 메모리 사용량: " + String.format("%.2f", memoryUsed) + "%\n" +
                    "- 최근 1분간 발생한 서버 에러(5xx): " + newErrors + "건\n\n" +
                    "대시보드를 확인하여 즉각 조치해 주세요.";
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(alertEmailTo);
                message.setSubject(subject);
                message.setText(text);
                mailSender.send(message);
            } catch (Exception e) {
                // 발송 실패 무시 (로깅 방지)
            }
        }
        lastServerErrorCount = currentErrors;
    }

    private List<CallSample> loadCallSamples() {
        List<String> raw = redis.opsForList().range(REDIS_CALLS, 0, MAX_CALL_SAMPLES - 1);
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        List<CallSample> list = new ArrayList<>(raw.size());
        for (String json : raw) {
            try {
                list.add(jsonMapper.readValue(json, CallSample.class));
            } catch (Exception ignored) {
                // skip bad entry
            }
        }
        return list;
    }

    private static long parseLong(Object v) {
        if (v == null) return 0L;
        try {
            return Long.parseLong(v.toString());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    /**
     * JSON-friendly call sample stored in Redis list.
     */
    public record CallSample(long at, String path, String method, long durationMs, int statusCode) {
    }
}
