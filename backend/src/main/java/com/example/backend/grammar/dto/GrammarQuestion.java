package com.example.backend.grammar.dto;

import java.util.List;

/**
 * 文法・語彙の4択問題。difficulty は 1=基礎 / 2=標準 / 3=発展。
 * point は文法項目(例:「関係代名詞」)。画面が解答後に、文法の教科書の該当する節へリンクするために使う。
 */
public record GrammarQuestion(String id, String sentence, List<GrammarChoice> choices, int difficulty, String point) {
}