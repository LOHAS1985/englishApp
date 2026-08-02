package com.example.backend.reading;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reading_records")
public class ReadingRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "article_id", nullable = false, length = 500)
    private String articleId;

    @Column(name = "article_title", nullable = false, length = 500)
    private String articleTitle;

    @Column(name = "word_count", nullable = false)
    private Integer wordCount;

    @Column(name = "duration_seconds", nullable = false)
    private Integer durationSeconds;

    @Column(nullable = false)
    private Integer wpm;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getArticleId() { return articleId; }
    public void setArticleId(String articleId) { this.articleId = articleId; }

    public String getArticleTitle() { return articleTitle; }
    public void setArticleTitle(String articleTitle) { this.articleTitle = articleTitle; }

    public Integer getWordCount() { return wordCount; }
    public void setWordCount(Integer wordCount) { this.wordCount = wordCount; }

    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }

    public Integer getWpm() { return wpm; }
    public void setWpm(Integer wpm) { this.wpm = wpm; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}