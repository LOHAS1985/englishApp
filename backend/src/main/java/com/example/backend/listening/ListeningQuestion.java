package com.example.backend.listening;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

/** 出題したリスニング問題と正解。採点時に参照する */
@Entity
@Table(name = "listening_questions")
public class ListeningQuestion {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "dialog_text", nullable = false, columnDefinition = "TEXT")
  private String dialogText;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String question;

  /** 選択肢を改行区切りで保持する */
  @Column(nullable = false, columnDefinition = "TEXT")
  private String choices;

  @Column(name = "correct_choice", nullable = false, length = 1)
  private String correctChoice;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }

  public String getDialogText() { return dialogText; }
  public void setDialogText(String dialogText) { this.dialogText = dialogText; }

  public String getQuestion() { return question; }
  public void setQuestion(String question) { this.question = question; }

  public List<String> getChoiceList() { return List.of(choices.split("\n", -1)); }
  public void setChoiceList(List<String> choiceList) { this.choices = String.join("\n", choiceList); }

  public String getCorrectChoice() { return correctChoice; }
  public void setCorrectChoice(String correctChoice) { this.correctChoice = correctChoice; }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
