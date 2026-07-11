package com.example.backend.reading;

public class HtmlUtils {
  public static String stripTags(String html) {
    if (html == null)
      return "";
    return html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
  }
}