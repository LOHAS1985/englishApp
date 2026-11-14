package com.example.backend.wordbook.dto;

/** 色ごとの語数と、訳がまだ揃っていない語数 */
public record SummaryView(
    long total,
    long none,
    long blue,
    long yellow,
    long red,
    long pendingTranslation) {
}
