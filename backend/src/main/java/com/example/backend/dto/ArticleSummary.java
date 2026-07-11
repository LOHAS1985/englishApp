package com.example.backend.dto;

public record ArticleSummary(
    String id,
    String title,
    String section,
    String thumbnail,
    String publishedDate) {
}