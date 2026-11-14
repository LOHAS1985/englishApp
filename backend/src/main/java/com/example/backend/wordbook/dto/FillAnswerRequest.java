package com.example.backend.wordbook.dto;

public record FillAnswerRequest(Long wordId, String typed, Integer durationSeconds) {
}
