package com.recode.Dwaeji.developer.service;

import com.recode.Dwaeji.developer.dto.TopEndpointDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class SystemMonitorService {

    private static final int MAX_ERRORS = 50;
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    /**
     * Ring buffer of recent calls for time-window analytics.
     */
    private static final int MAX_CALL_SAMPLES = 20_000;
    private final AtomicLong successCount = new AtomicLong(0);
    private final AtomicLong redirectionCount = new AtomicLong(0);
    private final AtomicLong notFoundCount = new AtomicLong(0);
    private final AtomicLong clientErrorCount = new AtomicLong(0);
    private final AtomicLong serverErrorCount = new AtomicLong(0);
    private final AtomicLong rateLimitedCount = new AtomicLong(0);
    private final AtomicLong totalCount = new AtomicLong(0);

    private final ConcurrentLinkedDeque<Map<String, Object>> recentErrors = new ConcurrentLinkedDeque<>();
    private final AtomicLong errorNoGenerator = new AtomicLong(1);
    private final ConcurrentHashMap<String, EndpointMetrics> endpointMetricsMap = new ConcurrentHashMap<>();
    private final ConcurrentLinkedDeque<CallSample> callSamples = new ConcurrentLinkedDeque<>();
    @Autowired(required = false)
    private JavaMailSender mailSender;
    @Value("${spring.mail.username:}")
    private String alertEmailTo;
    private long lastServerErrorCount = 0;

    public void recordTraffic(int statusCode) {
        totalCount.incrementAndGet();
        if (statusCode >= 200 && statusCode < 300) {
            successCount.incrementAndGet();
        } else if (statusCode >= 300 && statusCode < 400) {
            redirectionCount.incrementAndGet();
        } else if (statusCode == 404) {
            notFoundCount.incrementAndGet();
        } else if (statusCode == 429) {
            rateLimitedCount.incrementAndGet();
        } else if (statusCode >= 400 && statusCode < 500) {
            clientErrorCount.incrementAndGet();
        } else if (statusCode >= 500) {
            serverErrorCount.incrementAndGet();
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
        String key = method.toUpperCase() + " " + path;
        endpointMetricsMap.computeIfAbsent(key, k -> new EndpointMetrics(path, method.toUpperCase()))
                .record(responseTimeMs);

        callSamples.addFirst(new CallSample(Instant.now(), path, method.toUpperCase(), responseTimeMs, statusCode));
        while (callSamples.size() > MAX_CALL_SAMPLES) {
            callSamples.removeLast();
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
        Instant cutoff = Instant.now().minusSeconds(hours * 3600L);
        long s2 = 0, s3 = 0, s4 = 0, s5 = 0, s429 = 0, total = 0;
        for (CallSample s : callSamples) {
            if (s.at().isBefore(cutoff)) continue;
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
        return serverErrorCount.get();
    }

    public double memoryUsedPercent() {
        long max = Runtime.getRuntime().maxMemory();
        long used = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        if (max <= 0) return 0;
        return used * 100.0 / max;
    }

    private List<TopEndpointDto> aggregateAllByCount(int limit) {
        return endpointMetricsMap.values().stream()
                .sorted(Comparator.comparingLong((EndpointMetrics m) -> m.count.get()).reversed())
                .limit(Math.max(1, limit))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private List<TopEndpointDto> aggregateWindow(int hours, int limit, boolean byAvgDesc) {
        Instant cutoff = Instant.now().minusSeconds(Math.max(1, hours) * 3600L);
        Map<String, long[]> agg = new HashMap<>(); // count, totalMs, maxMs
        Map<String, String[]> meta = new HashMap<>();
        for (CallSample s : callSamples) {
            if (s.at().isBefore(cutoff)) continue;
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

    private TopEndpointDto toDto(EndpointMetrics m) {
        long c = m.count.get();
        long totalTime = m.totalDurationMs.get();
        double avgTime = c > 0 ? (double) totalTime / c : 0.0;
        double roundedAvg = Math.round(avgTime * 100.0) / 100.0;
        return TopEndpointDto.builder()
                .path(m.path)
                .method(m.method)
                .count(c)
                .avgResponseTimeMs(roundedAvg)
                .maxResponseTimeMs(m.maxDurationMs.get())
                .build();
    }

    public void addErrorLog(String errorMessage, String exceptionType, String requestUrl, String apiPath, String who, int httpCode, String referer, String clientIp) {
        Map<String, Object> errorLog = new ConcurrentHashMap<>();
        errorLog.put("no", errorNoGenerator.getAndIncrement());
        errorLog.put("timestamp", LocalDateTime.now().format(formatter));
        errorLog.put("message", errorMessage != null ? errorMessage : "No message");
        errorLog.put("type", exceptionType != null ? exceptionType : "Unknown");
        errorLog.put("httpCode", httpCode);
        errorLog.put("requestUrl", requestUrl != null ? requestUrl : "Unknown");
        errorLog.put("apiPath", apiPath != null ? apiPath : "Unknown");
        errorLog.put("who", who != null ? who : "로그인 전");
        errorLog.put("referer", referer != null ? referer : "알 수 없음");
        errorLog.put("clientIp", clientIp != null ? clientIp : "Unknown");

        recentErrors.addFirst(errorLog);
        if (recentErrors.size() > MAX_ERRORS) {
            recentErrors.removeLast();
        }
    }

    public Map<String, Long> getTrafficStats() {
        return Map.of(
                "success", successCount.get(),
                "redirection", redirectionCount.get(),
                "notFound", notFoundCount.get(),
                "clientError", clientErrorCount.get(),
                "serverError", serverErrorCount.get(),
                "rateLimited", rateLimitedCount.get(),
                "total", totalCount.get()
        );
    }

    public Object[] getRecentErrors() {
        return recentErrors.toArray();
    }

    @Scheduled(fixedRate = 60000) // 1분(60초)마다 서버 모니터링 및 알림 발송
    public void checkAndSendAlerts() {
        if (mailSender == null || alertEmailTo == null || alertEmailTo.isEmpty()) {
            return; // 메일 설정이 없으면 패스
        }

        double memoryUsed = memoryUsedPercent();
        long currentErrors = serverErrorCount.get();
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

    private static class EndpointMetrics {
        final String path;
        final String method;
        final AtomicLong count = new AtomicLong(0);
        final AtomicLong totalDurationMs = new AtomicLong(0);
        final AtomicLong maxDurationMs = new AtomicLong(0);

        EndpointMetrics(String path, String method) {
            this.path = path;
            this.method = method;
        }

        void record(long durationMs) {
            count.incrementAndGet();
            totalDurationMs.addAndGet(durationMs);
            maxDurationMs.updateAndGet(prev -> Math.max(prev, durationMs));
        }
    }

    private record CallSample(Instant at, String path, String method, long durationMs, int statusCode) {
    }
}
