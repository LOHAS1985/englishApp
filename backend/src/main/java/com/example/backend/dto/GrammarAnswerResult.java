package com.example.backend.dto;

public record GrammarAnswerResult(
    boolean correct,
    String correctChoice,
    String explanation,
    String translation) {
}