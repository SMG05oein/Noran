package com.recode.Dwaeji.developer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.recode.Dwaeji.developer.dto.DevAuthBodyDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NetlifyDeployService {

    private final RestClient.Builder restClientBuilder;
    private final DevExecutorAuth executorAuth;
    private final DevAuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${netlify.token:}")
    private String token;

    @Value("${netlify.site-id:}")
    private String siteId;

    @Value("${netlify.build-hook-url:}")
    private String buildHookUrl;

    @Value("${netlify.site-admin-url:}")
    private String siteAdminUrl;

    private static String text(JsonNode n, String field) {
        if (n == null || !n.has(field) || n.get(field).isNull()) return null;
        return n.get(field).asText();
    }

    private static String first(String a, String b) {
        return a != null ? a : b;
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    public boolean isConfigured() {
        return token != null && !token.isBlank() && siteId != null && !siteId.isBlank();
    }

    public boolean buildHookMissing() {
        return buildHookUrl == null || buildHookUrl.isBlank();
    }

    public Map<String, Object> status() {
        ensureConfigured();
        JsonNode site = getJson("https://api.netlify.com/api/v1/sites/" + siteId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("configured", true);
        out.put("siteId", siteId);
        out.put("siteName", text(site, "name"));
        out.put("url", text(site, "url"));
        out.put("adminUrl", blankToNull(siteAdminUrl));

        Map<String, Object> published = null;
        String publishedId = text(site, "published_deploy");
        // published_deploy can be object in some responses
        JsonNode pubNode = site.get("published_deploy");
        if (pubNode != null && pubNode.isObject()) {
            published = sanitizeDeploy(pubNode);
        } else if (publishedId != null) {
            try {
                published = sanitizeDeploy(getJson("https://api.netlify.com/api/v1/deploys/" + publishedId));
            } catch (Exception ignored) {
            }
        }
        out.put("publishedDeploy", published);
        return out;
    }

    public List<Map<String, Object>> listDeploys(int perPage) {
        ensureConfigured();
        int n = Math.max(1, Math.min(perPage, 50));
        JsonNode arr = getJson("https://api.netlify.com/api/v1/sites/" + siteId + "/deploys?per_page=" + n);
        List<Map<String, Object>> list = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode d : arr) {
                list.add(sanitizeDeploy(d));
            }
        }
        return list;
    }

    public Map<String, Object> triggerDeploy(DevAuthBodyDto body, Boolean clearCache, String actor, String ip) {
        executorAuth.require(body.getId(), body.getPw());
        if (buildHookMissing()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "netlify.build-hook-url not configured");
        }
        try {
            String uri = buildHookUrl;
            if (Boolean.TRUE.equals(clearCache)) {
                uri = uri.contains("?") ? uri + "&clear_cache=true" : uri + "?clear_cache=true";
            }
            restClientBuilder.build().post().uri(uri).retrieve().toBodilessEntity();
            auditService.record("dashboard", actor, "netlify-deploy", true, "hook ok", ip);
            return Map.of("ok", true, "message", "Netlify build hook triggered");
        } catch (Exception e) {
            auditService.record("dashboard", actor, "netlify-deploy", false, e.getMessage(), ip);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Build hook failed: " + e.getMessage());
        }
    }

    public Map<String, Object> rollback(DevAuthBodyDto body, String deployId, String actor, String ip) {
        executorAuth.require(body.getId(), body.getPw());
        ensureConfigured();
        if (deployId == null || deployId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deployId required");
        }
        try {
            restClientBuilder.build()
                    .post()
                    .uri("https://api.netlify.com/api/v1/sites/" + siteId + "/deploys/" + deployId + "/restore")
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .toBodilessEntity();
            auditService.record("dashboard", actor, "netlify-rollback:" + deployId, true, "ok", ip);
            return Map.of("ok", true, "deployId", deployId);
        } catch (Exception e) {
            auditService.record("dashboard", actor, "netlify-rollback:" + deployId, false, e.getMessage(), ip);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Rollback failed: " + e.getMessage());
        }
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Netlify token/site-id not configured");
        }
    }

    private JsonNode getJson(String url) {
        try {
            String body = restClientBuilder.build()
                    .get()
                    .uri(url)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readTree(body);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Netlify API error: " + e.getMessage());
        }
    }

    private Map<String, Object> sanitizeDeploy(JsonNode d) {
        Map<String, Object> m = new LinkedHashMap<>();
        String id = text(d, "id");
        m.put("id", id);
        m.put("state", text(d, "state"));
        m.put("branch", text(d, "branch"));
        m.put("commitRef", first(text(d, "commit_ref"), text(d, "commit_hash")));
        m.put("commitMessage", text(d, "title"));
        m.put("createdAt", text(d, "created_at"));
        m.put("publishedAt", text(d, "published_at"));
        m.put("errorMessage", text(d, "error_message"));
        m.put("deployUrl", text(d, "deploy_ssl_url") != null ? text(d, "deploy_ssl_url") : text(d, "ssl_url"));
        if (siteAdminUrl != null && !siteAdminUrl.isBlank() && id != null) {
            String base = siteAdminUrl.endsWith("/") ? siteAdminUrl.substring(0, siteAdminUrl.length() - 1) : siteAdminUrl;
            m.put("adminUrl", base + "/deploys/" + id);
        } else {
            m.put("adminUrl", null);
        }
        return m;
    }
}
