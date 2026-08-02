package com.example.backend.reading;

public class HtmlUtils {
    public static String stripTags(String html) {
        if (html == null) return "";
        String withBreaks = html
            .replaceAll("(?i)</p>", "\n\n")
            .replaceAll("(?i)<br\\s*/?>", "\n")
            .replaceAll("(?i)</h[1-6]>", "\n\n");

        String noTags = withBreaks.replaceAll("<[^>]+>", "");

        return noTags
            .replaceAll("[ \\t]+", " ")
            .replaceAll("\\n{3,}", "\n\n")
            .trim();
    }
}