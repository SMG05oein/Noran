package com.recode.Dwaeji.common.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the browser page URL for ops error logs.
 * Prefer SPA-sent {@code X-Client-Page} ({@code window.location.href});
 * {@code Origin} has no path so it alone cannot show {@code /dev/dashboard}.
 */
public final class ClientPageResolver {

    public static final String HEADER = "X-Client-Page";

    private ClientPageResolver() {
    }

    public static String resolve(HttpServletRequest request) {
        String clientPage = request.getHeader(HEADER);
        if (hasText(clientPage)) {
            return clientPage.trim();
        }
        String referer = request.getHeader("Referer");
        if (hasText(referer) && hasMeaningfulPath(referer)) {
            return referer.trim();
        }
        if (hasText(referer)) {
            return referer.trim();
        }
        String origin = request.getHeader("Origin");
        if (hasText(origin)) {
            return origin.trim();
        }
        return "알 수 없음";
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    /** True if URL path is more than "/" (e.g. /dev/dashboard). */
    private static boolean hasMeaningfulPath(String url) {
        try {
            String path = java.net.URI.create(url.trim()).getPath();
            return path != null && path.length() > 1;
        } catch (Exception e) {
            return false;
        }
    }
}
