package com.recode.Dwaeji.work_record.excelcompare;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
public class ExcelCompareSessionStore {

    private static final long TTL_HOURS = 2;
    private final Map<String, ExcelCompareSession> sessions = new ConcurrentHashMap<>();

    @Value("${work-record.excel.compare-max-sessions:3}")
    private int maxSessions;

    public void put(ExcelCompareSession session) {
        purgeExpired();
        // 기존 세션 상태 갱신(PROCESSING→DONE 등)은 슬롯을 늘리지 않으므로 제외
        if (!sessions.containsKey(session.getSessionId()) && sessions.size() >= maxSessions) {
            // 본인 세션이 있으면 가장 오래된 것부터 비워 새 대조 허용
            Optional<String> oldestOwnId = sessions.values().stream()
                    .filter(s -> Objects.equals(s.getRequesterId(), session.getRequesterId()))
                    .min(Comparator.comparing(ExcelCompareSession::getCreatedAt,
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .map(ExcelCompareSession::getSessionId);
            if (oldestOwnId.isPresent()) {
                sessions.remove(oldestOwnId.get());
            } else {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        String.format("엑셀 대조는 동시에 최대 %d건까지 가능합니다. 잠시 후 다시 시도해 주세요.", maxSessions));
            }
        }
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

    public List<ExcelCompareSession> listByRequester(String requesterId) {
        purgeExpired();
        return sessions.values().stream()
                .filter(s -> Objects.equals(s.getRequesterId(), requesterId))
                .sorted(Comparator.comparing(ExcelCompareSession::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    public int getMaxSessions() {
        return maxSessions;
    }

    public void remove(String sessionId) {
        sessions.remove(sessionId);
    }

    private void purgeExpired() {
        Instant cutoff = Instant.now().minus(TTL_HOURS, ChronoUnit.HOURS);
        sessions.entrySet().removeIf(e -> e.getValue().getCreatedAt().isBefore(cutoff));
    }
}
