package com.example.backend.service;

public class HtmlUtils {
  public static String stripTags(String html) {
    if (html == null)
      return "";
    return html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
  }
}