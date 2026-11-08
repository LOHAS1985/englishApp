package com.example.backend.reading;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** 読解速度の計測1回分(本文を読み終えるまでの秒数と本文の語数)。TOEIC Part 7 などの長文練習で記録する */
@Entity
@Table(name = "reading_speeds")
public class ReadingSpeed {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "set_id", nullable = false, length = 40)
  private String setId;

  /** 形式(toeic-part7 など) */
  @Column(name = "item_type", nullable = false, length = 40)
  private String itemType;

  @Column(nullable = false)
  private int words;

  @Column(name = "reading_seconds", nullable = false)
  private int readingSeconds;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  public ReadingSpeed() {
  }

  public ReadingSpeed(Long userId, String setId, String itemType, int words, int readingSeconds,
      LocalDateTime createdAt) {
    this.userId = userId;
    this.setId = setId;
    this.itemType = itemType;
    this.words = words;
    this.readingSeconds = readingSeconds;
    this.createdAt = createdAt;
  }

  public Long getId() { return id; }
  public Long getUserId() { return userId; }
  public String getSetId() { return setId; }
  public String getItemType() { return itemType; }
  public int getWords() { return words; }
  public int getReadingSeconds() { return readingSeconds; }
  public LocalDateTime getCreatedAt() { return createdAt; }
}
