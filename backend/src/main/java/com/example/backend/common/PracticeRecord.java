package com.example.backend.common;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** 問題集(語彙・リーディング・リスニング)の解答記録。1設問につき1行 */
@Entity
@Table(name = "practice_records")
public class PracticeRecord {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  /** vocab / reading / listening */
  @Column(nullable = false, length = 20)
  private String feature;

  /** 問題またはセットのID(例: v0001, r0001) */
  @Column(name = "item_id", nullable = false, length = 20)
  private String itemId;

  /** セット内の設問番号(1始まり)。単問は 1 */
  @Column(name = "question_no", nullable = false)
  private int questionNo;

  @Column(name = "selected_choice", length = 1)
  private String selectedChoice;

  @Column(name = "is_correct")
  private Boolean correct;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public PracticeRecord() {
  }

  public PracticeRecord(Long userId, String feature, String itemId, int questionNo, String selectedChoice,
      Boolean correct) {
    this.userId = userId;
    this.feature = feature;
    this.itemId = itemId;
    this.questionNo = questionNo;
    this.selectedChoice = selectedChoice;
    this.correct = correct;
  }

  public Long getId() { return id; }
  public Long getUserId() { return userId; }
  public String getFeature() { return feature; }
  public String getItemId() { return itemId; }
  public int getQuestionNo() { return questionNo; }
  public String getSelectedChoice() { return selectedChoice; }
  public Boolean getCorrect() { return correct; }
  public LocalDateTime getCreatedAt() { return createdAt; }
}
