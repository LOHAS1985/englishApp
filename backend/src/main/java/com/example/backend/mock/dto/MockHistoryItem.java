package com.example.backend.mock.dto;

import com.example.backend.mock.MockExam;

import java.time.LocalDateTime;

/** 過去の模試の結果(推移のグラフに使う。新しい順で返す) */
public record MockHistoryItem(
    long id,
    int listeningCorrect,
    int listeningTotal,
    int readingCorrect,
    int readingTotal,
    int listeningScore,
    int readingScore,
    int estimatedTotal,
    LocalDateTime createdAt) {

  public static MockHistoryItem from(MockExam m) {
    return new MockHistoryItem(m.getId(), m.getListeningCorrect(), m.getListeningTotal(), m.getReadingCorrect(),
        m.getReadingTotal(), m.getListeningScore(), m.getReadingScore(),
        m.getListeningScore() + m.getReadingScore(), m.getCreatedAt());
  }
}
