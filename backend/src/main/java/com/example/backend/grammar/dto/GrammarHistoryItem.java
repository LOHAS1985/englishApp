package com.example.backend.grammar.dto;

import com.example.backend.grammar.GrammarRecord;
import java.time.LocalDateTime;

public record GrammarHistoryItem(
    Long id,
    String sentence,
    String choiceA,
    String choiceB,
    String choiceC,
    String choiceD,
    String correctChoice,
    String selectedChoice,
    boolean correct,
    String explanation,
    String translation,
    LocalDateTime createdAt) {
  public static GrammarHistoryItem from(GrammarRecord r) {
    return new GrammarHistoryItem(
        r.getId(), r.getSentence(),
        r.getChoiceA(), r.getChoiceB(), r.getChoiceC(), r.getChoiceD(),
        r.getCorrectChoice(), r.getSelectedChoice(), r.isCorrect(),
        r.getExplanation(), r.getTranslation(), r.getCreatedAt());
  }
}