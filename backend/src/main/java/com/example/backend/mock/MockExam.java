package com.example.backend.mock;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** 模試の結果(区切りごとの正解数・点数・時間)。設問ごとの解答は PracticeRecord などに残る */
@Entity
@Table(name = "mock_exams")
public class MockExam {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  /** 試験(現状は TOEIC のみ) */
  @Column(nullable = false, length = 20)
  private String exam;

  @Column(name = "listening_correct", nullable = false)
  private int listeningCorrect;

  @Column(name = "listening_total", nullable = false)
  private int listeningTotal;

  @Column(name = "reading_correct", nullable = false)
  private int readingCorrect;

  @Column(name = "reading_total", nullable = false)
  private int readingTotal;

  /** 推定点(参考値)。換算を変えても過去の結果が変わらないよう、保存時の値を残す */
  @Column(name = "listening_score", nullable = false)
  private int listeningScore;

  @Column(name = "reading_score", nullable = false)
  private int readingScore;

  @Column(name = "listening_seconds", nullable = false)
  private int listeningSeconds;

  @Column(name = "reading_seconds", nullable = false)
  private int readingSeconds;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  public MockExam() {
  }

  public MockExam(Long userId, String exam, int listeningCorrect, int listeningTotal, int readingCorrect,
      int readingTotal, int listeningScore, int readingScore, int listeningSeconds, int readingSeconds,
      LocalDateTime createdAt) {
    this.userId = userId;
    this.exam = exam;
    this.listeningCorrect = listeningCorrect;
    this.listeningTotal = listeningTotal;
    this.readingCorrect = readingCorrect;
    this.readingTotal = readingTotal;
    this.listeningScore = listeningScore;
    this.readingScore = readingScore;
    this.listeningSeconds = listeningSeconds;
    this.readingSeconds = readingSeconds;
    this.createdAt = createdAt;
  }

  public Long getId() { return id; }
  public Long getUserId() { return userId; }
  public String getExam() { return exam; }
  public int getListeningCorrect() { return listeningCorrect; }
  public int getListeningTotal() { return listeningTotal; }
  public int getReadingCorrect() { return readingCorrect; }
  public int getReadingTotal() { return readingTotal; }
  public int getListeningScore() { return listeningScore; }
  public int getReadingScore() { return readingScore; }
  public int getListeningSeconds() { return listeningSeconds; }
  public int getReadingSeconds() { return readingSeconds; }
  public LocalDateTime getCreatedAt() { return createdAt; }
}
