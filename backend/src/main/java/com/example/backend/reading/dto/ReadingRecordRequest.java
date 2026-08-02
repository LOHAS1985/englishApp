package com.example.backend.reading.dto;

public class ReadingRecordRequest {
    private String articleId;
    private String articleTitle;
    private int wordCount;
    private int durationSeconds;

    public String getArticleId() { return articleId; }
    public void setArticleId(String articleId) { this.articleId = articleId; }

    public String getArticleTitle() { return articleTitle; }
    public void setArticleTitle(String articleTitle) { this.articleTitle = articleTitle; }

    public int getWordCount() { return wordCount; }
    public void setWordCount(int wordCount) { this.wordCount = wordCount; }

    public int getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(int durationSeconds) { this.durationSeconds = durationSeconds; }
}