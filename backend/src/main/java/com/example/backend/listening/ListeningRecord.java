package com.example.backend.listening;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "listening_records")
public class ListeningRecord {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "question_id", nullable = false)
  private Long questionId;

  @Column(name = "selected_choice", nullable = false, length = 1)
  private String selectedChoice;

  @Column(name = "is_correct", nullable = false)
  private boolean correct;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }

  public Long getUserId() { return userId; }
  public void setUserId(Long userId) { this.userId = userId; }

  public Long getQuestionId() { return questionId; }
  public void setQuestionId(Long questionId) { this.questionId = questionId; }

  public String getSelectedChoice() { return selectedChoice; }
  public void setSelectedChoice(String selectedChoice) { this.selectedChoice = selectedChoice; }

  public boolean isCorrect() { return correct; }
  public void setCorrect(boolean correct) { this.correct = correct; }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
