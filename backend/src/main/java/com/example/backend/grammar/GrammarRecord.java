package com.example.backend.grammar;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "grammar_records")
public class GrammarRecord {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String sentence;

  @Column(name = "choice_a", nullable = false)
  private String choiceA;

  @Column(name = "choice_b", nullable = false)
  private String choiceB;

  @Column(name = "choice_c", nullable = false)
  private String choiceC;

  @Column(name = "choice_d", nullable = false)
  private String choiceD;

  @Column(name = "correct_choice", nullable = false, length = 1)
  private String correctChoice;

  @Column(name = "selected_choice", nullable = false, length = 1)
  private String selectedChoice;

  @Column(name = "is_correct", nullable = false)
  private boolean correct;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String explanation;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String translation;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

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

  public String getSentence() {
    return sentence;
  }

  public void setSentence(String sentence) {
    this.sentence = sentence;
  }

  public String getChoiceA() {
    return choiceA;
  }

  public void setChoiceA(String choiceA) {
    this.choiceA = choiceA;
  }

  public String getChoiceB() {
    return choiceB;
  }

  public void setChoiceB(String choiceB) {
    this.choiceB = choiceB;
  }

  public String getChoiceC() {
    return choiceC;
  }

  public void setChoiceC(String choiceC) {
    this.choiceC = choiceC;
  }

  public String getChoiceD() {
    return choiceD;
  }

  public void setChoiceD(String choiceD) {
    this.choiceD = choiceD;
  }

  public String getCorrectChoice() {
    return correctChoice;
  }

  public void setCorrectChoice(String correctChoice) {
    this.correctChoice = correctChoice;
  }

  public String getSelectedChoice() {
    return selectedChoice;
  }

  public void setSelectedChoice(String selectedChoice) {
    this.selectedChoice = selectedChoice;
  }

  public boolean isCorrect() {
    return correct;
  }

  public void setCorrect(boolean correct) {
    this.correct = correct;
  }

  public String getExplanation() {
    return explanation;
  }

  public void setExplanation(String explanation) {
    this.explanation = explanation;
  }

  public String getTranslation() {
    return translation;
  }

  public void setTranslation(String translation) {
    this.translation = translation;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}