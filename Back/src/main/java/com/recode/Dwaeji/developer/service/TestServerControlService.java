package com.recode.Dwaeji.developer.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class TestServerControlService {

    private static final Logger log = LoggerFactory.getLogger(TestServerControlService.class);
    private static final Duration CMD_TIMEOUT = Duration.ofSeconds(90);

    private final String scriptPath;
    private final int testPort;
    private final int serverPort;
    private final String appEnv;
    private final boolean controlEnabled;
    private final String testWwwUrl;
    private final String testApiUrl;

    public TestServerControlService(
            @Value("${test.server.script:/home/opc/deploy-test.sh}") String scriptPath,
            @Value("${test.server.port:8082}") int testPort,
            @Value("${server.port:8080}") int serverPort,
            @Value("${app.env:prod}") String appEnv,
            @Value("${test.server.control-enabled:true}") boolean controlEnabled,
            @Value("${test.server.www-url:https://testwww.dwaeji.kr}") String testWwwUrl,
            @Value("${test.server.api-url:https://testapi.dwaeji.kr}") String testApiUrl) {
        this.scriptPath = scriptPath;
        this.testPort = testPort;
        this.serverPort = serverPort;
        this.appEnv = appEnv == null ? "prod" : appEnv;
        this.controlEnabled = controlEnabled;
        this.testWwwUrl = testWwwUrl;
        this.testApiUrl = testApiUrl;
    }

    public boolean scriptPresent() {
        return Files.isRegularFile(Path.of(scriptPath));
    }

    public boolean isControlAvailable() {
        if (!controlEnabled) {
            return false;
        }
        if (serverPort == testPort) {
            return false;
        }
        if ("test".equalsIgnoreCase(appEnv.trim())) {
            return false;
        }
        // Local Windows / machines without OCI script → UI shows disabled, no WARN spam
        return scriptPresent();
    }

    public Map<String, Object> status() {
        Map<String, Object> out = baseMeta();
        if (!scriptPresent()) {
            out.put("controlAvailable", false);
            out.put("running", false);
            out.put("healthy", false);
            out.put("message", "Script not found on this host (OCI only): " + scriptPath);
            return out;
        }
        if (!isControlAvailable()) {
            out.put("controlAvailable", false);
            out.put("message", "Test-server control is disabled on this instance (APP_ENV=test or port match).");
            return out;
        }
        try {
            ScriptResult r = runScript("status");
            out.putAll(parseKv(r.stdout));
            out.put("exitCode", r.exitCode);
            out.put("raw", r.stdout.trim());
            if (r.exitCode != 0) {
                out.put("error", r.stderr.trim());
            }
        } catch (Exception e) {
            out.put("running", false);
            out.put("healthy", false);
            out.put("error", e.getMessage());
            log.warn("test-server status failed: {}", e.toString());
        }
        return out;
    }

    public Map<String, Object> start() {
        return mutate("start");
    }

    public Map<String, Object> stop() {
        return mutate("stop");
    }

    public Map<String, Object> deploy() {
        return mutate("deploy");
    }

    private Map<String, Object> mutate(String cmd) {
        requireControl();
        try {
            ScriptResult r = runScript(cmd);
            Map<String, Object> out = baseMeta();
            out.putAll(parseKv(r.stdout));
            out.put("command", cmd);
            out.put("exitCode", r.exitCode);
            out.put("raw", r.stdout.trim());
            if (!r.stderr.isBlank()) {
                out.put("stderr", r.stderr.trim());
            }
            if (r.exitCode != 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "deploy-test.sh " + cmd + " failed (exit " + r.exitCode + "): "
                                + (r.stderr.isBlank() ? r.stdout : r.stderr));
            }
            Map<String, Object> refreshed = status();
            refreshed.put("command", cmd);
            refreshed.put("ok", true);
            if (!r.stderr.isBlank()) {
                refreshed.put("stderr", r.stderr.trim());
            }
            return refreshed;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("test-server {} failed", cmd, e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, e.getMessage());
        }
    }

    private void requireControl() {
        if (!isControlAvailable()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_IMPLEMENTED,
                    "Test-server control unavailable on this instance");
        }
        if (!Files.isExecutable(Path.of(scriptPath)) && !Files.isRegularFile(Path.of(scriptPath))) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_IMPLEMENTED,
                    "Script missing: " + scriptPath);
        }
    }

    private Map<String, Object> baseMeta() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("controlAvailable", isControlAvailable());
        m.put("script", scriptPath);
        m.put("port", testPort);
        m.put("wwwUrl", testWwwUrl);
        m.put("apiUrl", testApiUrl);
        return m;
    }

    private ScriptResult runScript(String cmd) throws Exception {
        if (!List.of("status", "start", "stop", "deploy").contains(cmd)) {
            throw new IllegalArgumentException("invalid cmd: " + cmd);
        }
        Path script = Path.of(scriptPath);
        if (!Files.isRegularFile(script)) {
            throw new IllegalStateException("Script not found: " + scriptPath);
        }
        ProcessBuilder pb = new ProcessBuilder("bash", script.toAbsolutePath().toString(), cmd);
        pb.redirectErrorStream(false);
        Process p = pb.start();
        boolean finished = p.waitFor(CMD_TIMEOUT.toSeconds(), TimeUnit.SECONDS);
        if (!finished) {
            p.destroyForcibly();
            throw new IllegalStateException("Timed out running deploy-test.sh " + cmd);
        }
        String stdout;
        String stderr;
        try (BufferedReader out = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8));
             BufferedReader err = new BufferedReader(new InputStreamReader(p.getErrorStream(), StandardCharsets.UTF_8))) {
            stdout = out.lines().collect(Collectors.joining("\n"));
            stderr = err.lines().collect(Collectors.joining("\n"));
        }
        return new ScriptResult(p.exitValue(), stdout, stderr);
    }

    private static Map<String, Object> parseKv(String stdout) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (stdout == null || stdout.isBlank()) {
            return m;
        }
        for (String line : stdout.split("\n")) {
            int eq = line.indexOf('=');
            if (eq <= 0) {
                continue;
            }
            String key = line.substring(0, eq).trim();
            String val = line.substring(eq + 1).trim();
            if (key.isEmpty()) {
                continue;
            }
            String lower = val.toLowerCase(Locale.ROOT);
            if ("true".equals(lower) || "false".equals(lower)) {
                m.put(key, Boolean.parseBoolean(lower));
            } else if (val.matches("-?\\d+")) {
                try {
                    m.put(key, Long.parseLong(val));
                } catch (NumberFormatException e) {
                    m.put(key, val);
                }
            } else {
                m.put(key, val);
            }
        }
        return m;
    }

    private record ScriptResult(int exitCode, String stdout, String stderr) {}
}
