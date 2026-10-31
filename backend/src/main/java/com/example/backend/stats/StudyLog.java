package com.example.backend.stats;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** 学習ログ。全技能の解答1回(セット問題は1セット)につき1行 */
@Entity
@Table(name = "study_logs")
public class StudyLog {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  /** grammar / vocab / reading / listening / writing / speaking */
  @Column(nullable = false, length = 20)
  private String feature;

  /** 試験の形式(toeic-part2, eiken-cloze など)。形式別の正答率に使う */
  @Column(name = "item_type", nullable = false, length = 40)
  private String itemType;

  @Column(name = "item_id", length = 40)
  private String itemId;

  /** 正解数。ライティングは得点(16点満点)。正誤が無いもの(スピーキング・記事)は null */
  @Column(name = "correct_count")
  private Integer correctCount;

  @Column(name = "total_count")
  private Integer totalCount;

  @Column(name = "duration_seconds", nullable = false)
  private int durationSeconds;

  /** 日ごとの集計を日本時間で行うため、日本時間で保存する */
  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  public StudyLog() {
  }

  public StudyLog(Long userId, String feature, String itemType, String itemId, Integer correctCount,
      Integer totalCount, int durationSeconds, LocalDateTime createdAt) {
    this.userId = userId;
    this.feature = feature;
    this.itemType = itemType;
    this.itemId = itemId;
    this.correctCount = correctCount;
    this.totalCount = totalCount;
    this.durationSeconds = durationSeconds;
    this.createdAt = createdAt;
  }

  public Long getId() { return id; }
  public Long getUserId() { return userId; }
  public String getFeature() { return feature; }
  public String getItemType() { return itemType; }
  public String getItemId() { return itemId; }
  public Integer getCorrectCount() { return correctCount; }
  public Integer getTotalCount() { return totalCount; }
  public int getDurationSeconds() { return durationSeconds; }
  public LocalDateTime getCreatedAt() { return createdAt; }
}
