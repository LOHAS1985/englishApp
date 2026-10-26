package com.example.backend.grammar;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** 出題済み・未回答の問題。正解をサーバー再起動後も保持するためDBに置く */
@Entity
@Table(name = "grammar_questions")
public class PendingGrammarQuestion {

  @Id
  @Column(length = 36)
  private String id;

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

  @Column(nullable = false, columnDefinition = "TEXT")
  private String explanation;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String translation;

  /** false = 事前生成したストック(未出題)、true = 出題済み・回答待ち */
  @Column(nullable = false)
  private boolean served;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public boolean isServed() { return served; }
  public void setServed(boolean served) { this.served = served; }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getSentence() { return sentence; }
  public void setSentence(String sentence) { this.sentence = sentence; }

  public String getChoiceA() { return choiceA; }
  public void setChoiceA(String choiceA) { this.choiceA = choiceA; }

  public String getChoiceB() { return choiceB; }
  public void setChoiceB(String choiceB) { this.choiceB = choiceB; }

  public String getChoiceC() { return choiceC; }
  public void setChoiceC(String choiceC) { this.choiceC = choiceC; }

  public String getChoiceD() { return choiceD; }
  public void setChoiceD(String choiceD) { this.choiceD = choiceD; }

  public String getCorrectChoice() { return correctChoice; }
  public void setCorrectChoice(String correctChoice) { this.correctChoice = correctChoice; }

  public String getExplanation() { return explanation; }
  public void setExplanation(String explanation) { this.explanation = explanation; }

  public String getTranslation() { return translation; }
  public void setTranslation(String translation) { this.translation = translation; }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
