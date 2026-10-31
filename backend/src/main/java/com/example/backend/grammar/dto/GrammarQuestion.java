package com.example.backend.grammar.dto;

import java.util.List;

/** 文法・語彙の4択問題。difficulty は 1=基礎 / 2=標準 / 3=発展 */
public record GrammarQuestion(String id, String sentence, List<GrammarChoice> choices, int difficulty) {
}