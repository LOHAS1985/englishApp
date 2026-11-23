package com.example.backend.wordbook.dto;

import com.example.backend.wordbook.BundledWordBank.Sense;

import java.util.List;

/**
 * 解答の結果。正解の答え(4択は訳、穴埋めは英単語)と、例文・訳、今の色を返す。
 * senses は品詞ごとの主な意味(出題の意味のほかにも使い方があると分かるように。同梱語にある語だけ)
 */
public record AnswerResultView(
    boolean correct,
    String word,
    String meaningJa,
    String correctAnswer,
    String exampleEn,
    String exampleJa,
    String color,
    List<Sense> senses) {
}
