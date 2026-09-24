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
import java.sql.Connection;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DeveloperDashboardService {

    private final DataSource dataSource;
    private final Environment environment;
    private final SystemMonitorService systemMonitorService;

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

    private final Instant processStart = Instant.now();

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

        systemInfo.put("traffic", systemMonitorService.getTrafficStats());
        systemInfo.put("recent_errors", systemMonitorService.getRecentErrors());

        systemInfo.put("health", buildHealth());
        systemInfo.put("version", buildVersion());

        return systemInfo;
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
        m.put("redeployConfigured", backendDeployWebhookUrl != null && !backendDeployWebhookUrl.isBlank());
        m.put("statusUrl", blankToNull(backendDeployStatusUrl));
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
}
