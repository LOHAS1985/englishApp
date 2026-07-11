package com.example.backend.dto;

import java.util.List;

public record ArticleDetail(
    String id,
    String title,
    String byline,
    String body,
    String webUrl,
    String publishedDate,
    String summary,
    List<VocabularyItem> vocabulary) {
}