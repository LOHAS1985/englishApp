package com.example.backend.reading.dto;

public record ArticleSummary(
        String id,
        String title,
        String section,
        String thumbnail,
        String publishedDate) {
}