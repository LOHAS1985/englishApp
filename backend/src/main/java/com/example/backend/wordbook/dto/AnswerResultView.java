package com.example.backend.wordbook.dto;

/** 解答の結果。正解の答え(4択は訳、穴埋めは英単語)と、例文・訳、今の色を返す */
public record AnswerResultView(
    boolean correct,
    String word,
    String meaningJa,
    String correctAnswer,
    String exampleEn,
    String exampleJa,
    String color) {
}
