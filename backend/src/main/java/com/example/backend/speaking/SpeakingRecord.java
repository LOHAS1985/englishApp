package com.example.backend.speaking;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** スピーキングの AI 採点の記録。文字起こしと採点結果(JSON)を残す */
@Entity
@Table(name = "speaking_records")
public class SpeakingRecord {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "set_id", nullable = false, length = 20)
  private String setId;

  @Column(name = "part_no", nullable = false)
  private int partNo;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String transcript;

  @Column(name = "speaking_seconds")
  private Integer speakingSeconds;

  @Column(name = "content_score", nullable = false)
  private int contentScore;

  @Column(name = "structure_score", nullable = false)
  private int structureScore;

  @Column(name = "vocabulary_score", nullable = false)
  private int vocabularyScore;

  @Column(name = "grammar_score", nullable = false)
  private int grammarScore;

  @Column(name = "total_score", nullable = false)
  private int totalScore;

  @Column(name = "feedback_json", nullable = false, columnDefinition = "TEXT")
  private String feedbackJson;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public SpeakingRecord() {
  }

  public SpeakingRecord(Long userId, String setId, int partNo, String transcript, Integer speakingSeconds,
      int contentScore, int structureScore, int vocabularyScore, int grammarScore, int totalScore,
      String feedbackJson) {
    this.userId = userId;
    this.setId = setId;
    this.partNo = partNo;
    this.transcript = transcript;
    this.speakingSeconds = speakingSeconds;
    this.contentScore = contentScore;
    this.structureScore = structureScore;
    this.vocabularyScore = vocabularyScore;
    this.grammarScore = grammarScore;
    this.totalScore = totalScore;
    this.feedbackJson = feedbackJson;
  }

  public Long getId() {
    return id;
  }

  public Long getUserId() {
    return userId;
  }

  public String getSetId() {
    return setId;
  }

  public int getPartNo() {
    return partNo;
  }

  public String getTranscript() {
    return transcript;
  }

  public Integer getSpeakingSeconds() {
    return speakingSeconds;
  }

  public int getContentScore() {
    return contentScore;
  }

  public int getStructureScore() {
    return structureScore;
  }

  public int getVocabularyScore() {
    return vocabularyScore;
  }

  public int getGrammarScore() {
    return grammarScore;
  }

  public int getTotalScore() {
    return totalScore;
  }

  public String getFeedbackJson() {
    return feedbackJson;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }
}
