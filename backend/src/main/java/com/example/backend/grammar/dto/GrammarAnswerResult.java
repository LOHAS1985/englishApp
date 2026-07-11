package com.example.backend.grammar.dto;

public record GrammarAnswerResult(
        boolean correct,
        String correctChoice,
        String explanation,
        String translation) {
}