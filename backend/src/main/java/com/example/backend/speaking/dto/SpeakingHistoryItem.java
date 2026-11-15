package com.example.backend.speaking.dto;

import java.time.LocalDateTime;

/**
 * AI 採点の履歴1件。
 *
 * @param title セットの題名(問題集から外れたときは ID)
 * @param part  1 = ナレーション、2〜4 = Q&A の質問番号
 */
public record SpeakingHistoryItem(
    Long id,
    String setId,
    String title,
    int part,
    String transcript,
    Integer speakingSeconds,
    SpeakingScoreResult result,
    LocalDateTime createdAt) {
}
