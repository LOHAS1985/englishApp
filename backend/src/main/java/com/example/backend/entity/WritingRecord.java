package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "writing_records")
public class WritingRecord {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(nullable = false, length = 500)
  private String topic;

  @Column(nullable = false, length = 500)
  private String prompt;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String points;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String answer;

  @Column(name = "word_count", nullable = false)
  private Integer wordCount;

  @Column(name = "content_score", nullable = false)
  private Integer contentScore;

  @Column(name = "content_feedback", nullable = false, columnDefinition = "TEXT")
  private String contentFeedback;

  @Column(name = "structure_score", nullable = false)
  private Integer structureScore;

  @Column(name = "structure_feedback", nullable = false, columnDefinition = "TEXT")
  private String structureFeedback;

  @Column(name = "vocabulary_score", nullable = false)
  private Integer vocabularyScore;

  @Column(name = "vocabulary_feedback", nullable = false, columnDefinition = "TEXT")
  private String vocabularyFeedback;

  @Column(name = "grammar_score", nullable = false)
  private Integer grammarScore;

  @Column(name = "grammar_feedback", nullable = false, columnDefinition = "TEXT")
  private String grammarFeedback;

  @Column(name = "total_score", nullable = false)
  private Integer totalScore;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public static String joinPoints(List<String> points) {
    return String.join("|||", points);
  }

  public List<String> getPointsList() {
    return List.of(points.split("\\|\\|\\|"));
  }

  // getters / setters
  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getUserId() {
    return userId;
  }

  public void setUserId(Long userId) {
    this.userId = userId;
  }

  public String getTopic() {
    return topic;
  }

  public void setTopic(String topic) {
    this.topic = topic;
  }

  public String getPrompt() {
    return prompt;
  }

  public void setPrompt(String prompt) {
    this.prompt = prompt;
  }

  public String getPoints() {
    return points;
  }

  public void setPoints(String points) {
    this.points = points;
  }

  public String getAnswer() {
    return answer;
  }

  public void setAnswer(String answer) {
    this.answer = answer;
  }

  public Integer getWordCount() {
    return wordCount;
  }

  public void setWordCount(Integer wordCount) {
    this.wordCount = wordCount;
  }

  public Integer getContentScore() {
    return contentScore;
  }

  public void setContentScore(Integer contentScore) {
    this.contentScore = contentScore;
  }

  public String getContentFeedback() {
    return contentFeedback;
  }

  public void setContentFeedback(String contentFeedback) {
    this.contentFeedback = contentFeedback;
  }

  public Integer getStructureScore() {
    return structureScore;
  }

  public void setStructureScore(Integer structureScore) {
    this.structureScore = structureScore;
  }

  public String getStructureFeedback() {
    return structureFeedback;
  }

  public void setStructureFeedback(String structureFeedback) {
    this.structureFeedback = structureFeedback;
  }

  public Integer getVocabularyScore() {
    return vocabularyScore;
  }

  public void setVocabularyScore(Integer vocabularyScore) {
    this.vocabularyScore = vocabularyScore;
  }

  public String getVocabularyFeedback() {
    return vocabularyFeedback;
  }

  public void setVocabularyFeedback(String vocabularyFeedback) {
    this.vocabularyFeedback = vocabularyFeedback;
  }

  public Integer getGrammarScore() {
    return grammarScore;
  }

  public void setGrammarScore(Integer grammarScore) {
    this.grammarScore = grammarScore;
  }

  public String getGrammarFeedback() {
    return grammarFeedback;
  }

  public void setGrammarFeedback(String grammarFeedback) {
    this.grammarFeedback = grammarFeedback;
  }

  public Integer getTotalScore() {
    return totalScore;
  }

  public void setTotalScore(Integer totalScore) {
    this.totalScore = totalScore;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}