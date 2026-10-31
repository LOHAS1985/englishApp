package com.example.backend.review;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** 間違えた問題の復習予定。正解するたびに stage を進めて間隔を延ばし、最後まで正解したら削除する */
@Entity
@Table(name = "review_items")
public class ReviewItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  /** vocab / grammar */
  @Column(nullable = false, length = 20)
  private String feature;

  @Column(name = "item_id", nullable = false, length = 20)
  private String itemId;

  @Column(nullable = false)
  private int stage;

  @Column(name = "due_date", nullable = false)
  private LocalDate dueDate;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  public ReviewItem() {
  }

  public ReviewItem(Long userId, String feature, String itemId) {
    this.userId = userId;
    this.feature = feature;
    this.itemId = itemId;
  }

  public Long getId() { return id; }
  public Long getUserId() { return userId; }
  public String getFeature() { return feature; }
  public String getItemId() { return itemId; }
  public int getStage() { return stage; }
  public LocalDate getDueDate() { return dueDate; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }

  void schedule(int stage, LocalDate dueDate, LocalDateTime now) {
    this.stage = stage;
    this.dueDate = dueDate;
    this.updatedAt = now;
  }
}
