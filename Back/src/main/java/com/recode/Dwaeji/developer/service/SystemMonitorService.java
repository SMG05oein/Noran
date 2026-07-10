package com.recode.Dwaeji.developer.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class SystemMonitorService {

    // Traffic Counters
    private final AtomicLong successCount = new AtomicLong(0);
    private final AtomicLong redirectionCount = new AtomicLong(0);
    private final AtomicLong notFoundCount = new AtomicLong(0);
    private final AtomicLong clientErrorCount = new AtomicLong(0);
    private final AtomicLong serverErrorCount = new AtomicLong(0);
    private final AtomicLong rateLimitedCount = new AtomicLong(0);
    private final AtomicLong totalCount = new AtomicLong(0);

    // Recent Errors (Max 50)
    private final ConcurrentLinkedDeque<Map<String, Object>> recentErrors = new ConcurrentLinkedDeque<>();
    private static final int MAX_ERRORS = 50;
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final AtomicLong errorNoGenerator = new AtomicLong(1);

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

    public void addErrorLog(String errorMessage, String exceptionType, String requestUrl, String apiPath, String who, int httpCode) {
        Map<String, Object> errorLog = new ConcurrentHashMap<>();
        errorLog.put("no", errorNoGenerator.getAndIncrement());
        errorLog.put("timestamp", LocalDateTime.now().format(formatter));
        errorLog.put("message", errorMessage != null ? errorMessage : "No message");
        errorLog.put("type", exceptionType != null ? exceptionType : "Unknown");
        errorLog.put("httpCode", httpCode);
        errorLog.put("requestUrl", requestUrl != null ? requestUrl : "Unknown");
        errorLog.put("apiPath", apiPath != null ? apiPath : "Unknown");
        errorLog.put("who", who != null ? who : "로그인 전");

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
}
