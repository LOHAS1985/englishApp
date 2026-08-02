package com.example.backend.reading.dto;

import com.example.backend.reading.ReadingRecord;
import java.time.LocalDateTime;

public record ReadingHistoryItem(
    Long id,
    String articleTitle,
    int wordCount,
    int durationSeconds,
    int wpm,
    LocalDateTime createdAt
) {
    public static ReadingHistoryItem from(ReadingRecord r) {
        return new ReadingHistoryItem(
            r.getId(), r.getArticleTitle(), r.getWordCount(),
            r.getDurationSeconds(), r.getWpm(), r.getCreatedAt()
        );
    }
}