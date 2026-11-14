package com.example.backend.wordbook.dto;

import java.time.LocalDateTime;

public record HistoryItem(Long wordId, String word, boolean correct, LocalDateTime createdAt) {
}
