package com.recode.Dwaeji.developer.controller;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import jakarta.annotation.PreDestroy;
import org.slf4j.ILoggerFactory;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Runtime log level control (no redeploy). Protected by DevIpAllowlistFilter (/api/dev/**)
 * and DEVELOPER role. Changes revert automatically after {@code minutes}.
 */
@RestController
@RequestMapping("/api/dev/logs/level")
public class DeveloperLogLevelController {

    private static final String PACKAGE_PREFIX = "com.recode.Dwaeji";
    private static final Set<String> ALLOWED_LEVELS = Set.of("ERROR", "WARN", "INFO", "DEBUG");
    private static final int MAX_MINUTES = 60;
    private static final int DEFAULT_MINUTES = 10;

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final Map<String, ScheduledFuture<?>> revertTasks = new ConcurrentHashMap<>();
    private final Map<String, Level> originalLevels = new ConcurrentHashMap<>();

    public record LevelRequest(String logger, String level, Integer minutes) {}

    @GetMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> getLevels() {
        LoggerContext ctx = context();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("root", ctx.getLogger(Logger.ROOT_LOGGER_NAME).getLevel().toString());
        body.put("basePackage", PACKAGE_PREFIX);
        body.put("overrides", originalLevels.keySet().stream().sorted().map(name -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("logger", name);
            m.put("level", String.valueOf(ctx.getLogger(name).getLevel()));
            return m;
        }).collect(Collectors.toList()));
        body.put("allowedLevels", List.of("ERROR", "WARN", "INFO", "DEBUG"));
        body.put("maxMinutes", MAX_MINUTES);
        return ResponseEntity.ok(body);
    }

    @PostMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> setLevel(@RequestBody LevelRequest req) {
        String name = req.logger() == null ? "" : req.logger().trim();
        if (!name.equals(PACKAGE_PREFIX) && !name.startsWith(PACKAGE_PREFIX + ".")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "logger must be under " + PACKAGE_PREFIX);
        }
        String levelStr = req.level() == null ? "" : req.level().trim().toUpperCase();
        if (!ALLOWED_LEVELS.contains(levelStr)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "level must be one of " + ALLOWED_LEVELS);
        }
        int minutes = req.minutes() == null ? DEFAULT_MINUTES : Math.max(1, Math.min(req.minutes(), MAX_MINUTES));

        Logger target = context().getLogger(name);
        originalLevels.putIfAbsent(name, target.getLevel() == null ? Level.INFO : target.getLevel());
        target.setLevel(Level.toLevel(levelStr));

        ScheduledFuture<?> prev = revertTasks.remove(name);
        if (prev != null) prev.cancel(false);
        revertTasks.put(name, scheduler.schedule(() -> revert(name), minutes, TimeUnit.MINUTES));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("logger", name);
        body.put("level", levelStr);
        body.put("revertAfterMinutes", minutes);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/reset")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> resetAll() {
        List<String> names = List.copyOf(originalLevels.keySet());
        names.forEach(this::revert);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("reset", names);
        return ResponseEntity.ok(body);
    }

    private void revert(String name) {
        Level original = originalLevels.remove(name);
        ScheduledFuture<?> task = revertTasks.remove(name);
        if (task != null) task.cancel(false);
        if (original != null) {
            context().getLogger(name).setLevel(original);
        }
    }

    private LoggerContext context() {
        ILoggerFactory f = LoggerFactory.getILoggerFactory();
        if (!(f instanceof LoggerContext ctx)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Logback is not in use");
        }
        return ctx;
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }
}
