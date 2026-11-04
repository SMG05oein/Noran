package com.recode.Dwaeji.common.util;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

/**
 * 저장·응답 HTML에서 스크립트 등 위험 마크업을 제거한다 (Stored XSS 방어).
 */
public final class HtmlSanitizer {

    private static final Safelist SAFELIST = Safelist.relaxed()
            .addAttributes(":all", "class")
            .addProtocols("a", "href", "http", "https", "mailto");

    private HtmlSanitizer() {
    }

    public static String sanitize(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }
        return Jsoup.clean(html, SAFELIST);
    }
}
