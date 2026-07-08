package com.example.backend.dto;

import com.example.backend.entity.WritingRecord;
import java.time.LocalDateTime;
import java.util.List;

public record WritingHistoryItem(
    Long id,
    String topic,
    List<String> points,
    String answer,
    int wordCount,
    int contentScore,
    String contentFeedback,
    int structureScore,
    String structureFeedback,
    int vocabularyScore,
    String vocabularyFeedback,
    int grammarScore,
    String grammarFeedback,
    int totalScore,
    LocalDateTime createdAt) {
  public static WritingHistoryItem from(WritingRecord r) {
    return new WritingHistoryItem(
        r.getId(), r.getTopic(), r.getPointsList(), r.getAnswer(), r.getWordCount(),
        r.getContentScore(), r.getContentFeedback(),
        r.getStructureScore(), r.getStructureFeedback(),
        r.getVocabularyScore(), r.getVocabularyFeedback(),
        r.getGrammarScore(), r.getGrammarFeedback(),
        r.getTotalScore(), r.getCreatedAt());
  }
}