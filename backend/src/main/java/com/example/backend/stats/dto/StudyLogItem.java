package com.example.backend.stats.dto;

import com.example.backend.stats.StudyLog;

import java.time.LocalDateTime;

public record StudyLogItem(
    long id,
    String feature,
    String type,
    String itemId,
    Integer correct,
    Integer total,
    int durationSeconds,
    LocalDateTime createdAt) {

  public static StudyLogItem from(StudyLog log) {
    return new StudyLogItem(log.getId(), log.getFeature(), log.getItemType(), log.getItemId(),
        log.getCorrectCount(), log.getTotalCount(), log.getDurationSeconds(), log.getCreatedAt());
  }
}
