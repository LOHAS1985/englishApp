package com.example.backend.wordbook.dto;

/**
 * 色ごとの語数と、訳がまだ揃っていない語数。
 * due は今日復習する語(復習日が来た語)、unseen はまだ一度も出していない語(どちらも出題できる語だけ)
 */
public record SummaryView(
    long total,
    long none,
    long blue,
    long yellow,
    long red,
    long pendingTranslation,
    long due,
    long unseen) {
}
