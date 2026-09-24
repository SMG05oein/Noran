package com.recode.Dwaeji.work_record.excelcompare;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ExcelCompareSessionStore {

    private static final long TTL_HOURS = 2;
    private final Map<String, ExcelCompareSession> sessions = new ConcurrentHashMap<>();

    public void put(ExcelCompareSession session) {
        purgeExpired();
        sessions.put(session.getSessionId(), session);
    }

    public Optional<ExcelCompareSession> get(String sessionId) {
        purgeExpired();
        ExcelCompareSession session = sessions.get(sessionId);
        if (session == null) {
            return Optional.empty();
        }
        if (session.getCreatedAt().isBefore(Instant.now().minus(TTL_HOURS, ChronoUnit.HOURS))) {
            sessions.remove(sessionId);
            return Optional.empty();
        }
        return Optional.of(session);
    }

    public void remove(String sessionId) {
        sessions.remove(sessionId);
    }

    private void purgeExpired() {
        Instant cutoff = Instant.now().minus(TTL_HOURS, ChronoUnit.HOURS);
        sessions.entrySet().removeIf(e -> e.getValue().getCreatedAt().isBefore(cutoff));
    }
}
