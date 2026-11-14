package com.example.backend.wordbook.dto;

import java.util.List;

/** 英単語を見せて、日本語の訳を4つから選ぶ問題 */
public record ChoiceQuestionView(Long wordId, String word, List<String> choices) {
}
