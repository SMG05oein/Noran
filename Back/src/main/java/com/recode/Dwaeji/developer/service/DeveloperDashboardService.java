package com.recode.Dwaeji.developer.service;

import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.File;
import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.lang.management.RuntimeMXBean;
import java.net.InetAddress;
import java.sql.Connection;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DeveloperDashboardService {

    private final DataSource dataSource;
    private final Environment environment;
    private final SystemMonitorService systemMonitorService;
    private final Instant processStart = Instant.now();
    @Value("${spring.application.name:Dwaeji}")
    private String appName;
    @Value("${git.sha:unknown}")
    private String gitShaProp;
    @Value("${build.time:}")
    private String buildTimeProp;
    @Value("${deploy.backend.webhook.url:}")
    private String backendDeployWebhookUrl;
    @Value("${deploy.backend.status.url:}")
    private String backendDeployStatusUrl;
    @Value("${server.port:8080}")
    private String serverPort;
    @Value("${alert.memory.used-percent-threshold:85}")
    private double memoryWarnThreshold;
    @Value("${alert.disk.free-percent-threshold:15}")
    private double diskWarnThreshold;

    private static double roundGb(long bytes) {
        return Math.round((bytes / (1024.0 * 1024.0 * 1024.0)) * 100.0) / 100.0;
    }

    private static String firstNonBlank(String... vals) {
        if (vals == null) return null;
        for (String v : vals) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    public Map<String, Object> buildSystemInfo() {
        Map<String, Object> systemInfo = new LinkedHashMap<>();

        long totalMemory = Runtime.getRuntime().totalMemory();
        long freeMemory = Runtime.getRuntime().freeMemory();
        long maxMemory = Runtime.getRuntime().maxMemory();
        long usedMemory = totalMemory - freeMemory;

        systemInfo.put("memory", Map.of(
                "total_mb", totalMemory / (1024 * 1024),
                "free_mb", freeMemory / (1024 * 1024),
                "max_mb", maxMemory / (1024 * 1024),
                "used_mb", usedMemory / (1024 * 1024)
        ));

        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        systemInfo.put("os", Map.of(
                "name", osBean.getName(),
                "arch", osBean.getArch(),
                "version", osBean.getVersion(),
                "processors", osBean.getAvailableProcessors()
        ));

        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        systemInfo.put("uptime", Map.of(
                "uptime_ms", uptimeMs,
                "uptime_seconds", uptimeMs / 1000
        ));

        // Redis 장애 시에도 나머지 시스템 정보는 내려가도록 격리
        try {
            systemInfo.put("traffic", systemMonitorService.getTrafficStats());
        } catch (Exception e) {
            systemInfo.put("traffic", Map.of(
                    "success", 0L, "redirection", 0L, "notFound", 0L, "clientError", 0L,
                    "serverError", 0L, "rateLimited", 0L, "total", 0L));
            systemInfo.put("trafficUnavailable", true);
        }
        try {
            systemInfo.put("recent_errors", systemMonitorService.getRecentErrors());
        } catch (Exception e) {
            systemInfo.put("recent_errors", new Object[0]);
            systemInfo.put("recentErrorsUnavailable", true);
        }

        Map<String, Object> health = buildHealth();
        systemInfo.put("health", health);
        systemInfo.put("version", buildVersion());
        systemInfo.put("host", buildHost(health));
        systemInfo.put("status", buildStatusSummary(health, systemInfo));
        systemInfo.put("fetchedAt", Instant.now().toString());

        return systemInfo;
    }

    /**
     * OCI single-host context for Ops Console.
     */
    public Map<String, Object> buildHost(Map<String, Object> health) {
        Map<String, Object> host = new LinkedHashMap<>();
        host.put("mode", "oci-single");
        host.put("deployMethod", "deploy.sh");
        host.put("blueGreenPorts", List.of(8080, 8081));
        host.put("serverPort", serverPort);
        try {
            host.put("hostname", InetAddress.getLocalHost().getHostName());
        } catch (Exception e) {
            host.put("hostname", "unknown");
        }
        try {
            host.put("pid", ProcessHandle.current().pid());
        } catch (Exception e) {
            host.put("pid", null);
        }
        File cwd = new File(".").getAbsoluteFile();
        host.put("workingDirectory", cwd.getAbsolutePath());
        if (health != null && health.get("disk") instanceof Map<?, ?> disk) {
            Object path = disk.get("path");
            if (path != null) host.put("diskPath", path.toString());
        }
        return host;
    }

    /**
     * overall: ok | warn | crit — Front uses for banner / card tint.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> buildStatusSummary(Map<String, Object> health, Map<String, Object> systemInfo) {
        List<String> issues = new ArrayList<>();
        String level = "ok";

        Map<String, Object> db = health != null && health.get("db") instanceof Map
                ? (Map<String, Object>) health.get("db") : Map.of();
        String dbStatus = String.valueOf(db.getOrDefault("status", "UNKNOWN"));
        if (!"UP".equalsIgnoreCase(dbStatus)) {
            level = "crit";
            issues.add("DB " + dbStatus);
        } else if (db.get("latencyMs") instanceof Number lat && lat.longValue() >= 200) {
            level = worse(level, "warn");
            issues.add("DB 지연 " + lat.longValue() + "ms");
        }

        Map<String, Object> disk = health != null && health.get("disk") instanceof Map
                ? (Map<String, Object>) health.get("disk") : Map.of();
        if (disk.get("freePercent") instanceof Number fp) {
            double free = fp.doubleValue();
            if (free <= diskWarnThreshold) {
                level = worse(level, free <= diskWarnThreshold / 2 ? "crit" : "warn");
                issues.add(String.format("디스크 여유 %.1f%%", free));
            }
        }

        Map<String, Object> memory = systemInfo != null && systemInfo.get("memory") instanceof Map
                ? (Map<String, Object>) systemInfo.get("memory") : Map.of();
        if (memory.get("used_mb") instanceof Number used && memory.get("max_mb") instanceof Number max
                && max.longValue() > 0) {
            double pct = used.doubleValue() * 100.0 / max.doubleValue();
            if (pct >= memoryWarnThreshold) {
                level = worse(level, pct >= 95 ? "crit" : "warn");
                issues.add(String.format("JVM 메모리 %.0f%%", pct));
            }
        }

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("overall", level);
        status.put("label", switch (level) {
            case "crit" -> "위험";
            case "warn" -> "주의";
            default -> "정상";
        });
        status.put("issues", issues);
        status.put("memoryWarnThreshold", memoryWarnThreshold);
        status.put("diskWarnThreshold", diskWarnThreshold);
        return status;
    }

    private static String worse(String current, String next) {
        int c = rank(current);
        int n = rank(next);
        return n > c ? next : current;
    }

    private static int rank(String level) {
        if ("crit".equals(level)) return 2;
        if ("warn".equals(level)) return 1;
        return 0;
    }

    public Map<String, Object> buildHealth() {
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("db", probeDb());
        health.put("disk", probeDisk());
        health.put("cpu", probeCpu());
        health.put("pool", probePool());
        return health;
    }

    public Map<String, Object> buildVersion() {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("appName", appName);
        v.put("profiles", environment.getActiveProfiles().length > 0
                ? environment.getActiveProfiles()
                : new String[]{"default"});
        String sha = firstNonBlank(System.getenv("GIT_SHA"), System.getenv("COMMIT_SHA"), gitShaProp);
        v.put("gitSha", sha == null || sha.isBlank() ? "unknown" : sha);
        String buildTime = firstNonBlank(buildTimeProp, System.getenv("BUILD_TIME"));
        v.put("buildTime", (buildTime == null || buildTime.isBlank()) ? null : buildTime);
        v.put("javaVersion", System.getProperty("java.version"));
        RuntimeMXBean rt = ManagementFactory.getRuntimeMXBean();
        v.put("startTime", Instant.ofEpochMilli(rt.getStartTime()).toString());
        return v;
    }

    public Map<String, Object> deployInfo() {
        Map<String, Object> m = new LinkedHashMap<>(buildVersion());
        // Existing Ops Console fields (keep names/types stable)
        m.put("redeployConfigured", backendDeployWebhookUrl != null && !backendDeployWebhookUrl.isBlank());
        m.put("statusUrl", blankToNull(backendDeployStatusUrl));
        // OCI single-host context (additive; Front may ignore)
        m.put("hostMode", "oci-single");
        m.put("deployMethod", "deploy.sh");
        m.put("message", "OCI single host · Front/API/DB co-located · JAR blue-green via deploy.sh (8080/8081)");
        return m;
    }

    public boolean isRedeployConfigured() {
        return backendDeployWebhookUrl != null && !backendDeployWebhookUrl.isBlank();
    }

    public String backendDeployWebhookUrl() {
        return backendDeployWebhookUrl;
    }

    private Map<String, Object> probeDb() {
        long t0 = System.currentTimeMillis();
        try (Connection c = dataSource.getConnection()) {
            boolean ok = c.isValid(3);
            long ms = System.currentTimeMillis() - t0;
            return Map.of("status", ok ? "UP" : "DOWN", "latencyMs", ms);
        } catch (Exception e) {
            return Map.of("status", "DOWN", "latencyMs", System.currentTimeMillis() - t0);
        }
    }

    private Map<String, Object> probeDisk() {
        File root = new File(".").getAbsoluteFile();
        long total = root.getTotalSpace();
        long free = root.getFreeSpace();
        long usable = root.getUsableSpace();
        double freePercent = total > 0 ? (free * 100.0 / total) : 0;
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("path", root.getAbsolutePath());
        d.put("totalGb", roundGb(total));
        d.put("freeGb", roundGb(free));
        d.put("usableGb", roundGb(usable));
        d.put("freePercent", Math.round(freePercent * 100.0) / 100.0);
        return d;
    }

    private Map<String, Object> probeCpu() {
        Map<String, Object> cpu = new HashMap<>();
        OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();
        cpu.put("systemLoadAverage", os.getSystemLoadAverage());
        Double processCpu = null;
        try {
            if (os instanceof com.sun.management.OperatingSystemMXBean sunOs) {
                double load = sunOs.getProcessCpuLoad();
                processCpu = load < 0 ? null : Math.round(load * 10000.0) / 10000.0;
            }
        } catch (Exception ignored) {
        }
        cpu.put("processCpuLoad", processCpu);
        return cpu;
    }

    private Map<String, Object> probePool() {
        Map<String, Object> pool = new LinkedHashMap<>();
        try {
            HikariDataSource hikari = dataSource.unwrap(HikariDataSource.class);
            HikariPoolMXBean mx = hikari.getHikariPoolMXBean();
            if (mx != null) {
                pool.put("active", mx.getActiveConnections());
                pool.put("idle", mx.getIdleConnections());
                pool.put("max", hikari.getMaximumPoolSize());
                pool.put("waiting", mx.getThreadsAwaitingConnection());
            } else {
                pool.put("active", null);
                pool.put("idle", null);
                pool.put("max", hikari.getMaximumPoolSize());
                pool.put("waiting", null);
            }
        } catch (Exception e) {
            pool.put("active", null);
            pool.put("idle", null);
            pool.put("max", null);
            pool.put("waiting", null);
        }
        return pool;
    }
}
