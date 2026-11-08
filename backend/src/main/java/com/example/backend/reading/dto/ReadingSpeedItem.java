package com.example.backend.reading.dto;

import com.example.backend.reading.ReadingSpeed;
import com.example.backend.reading.ReadingSpeedService;

import java.time.LocalDateTime;

/** 読解速度の1回分。wpm は 語数 ÷ 分(四捨五入)。ReadingService の多読記録と同じ計算 */
public record ReadingSpeedItem(String itemType, int words, int readingSeconds, int wpm, LocalDateTime createdAt) {

  public static ReadingSpeedItem from(ReadingSpeed s) {
    return new ReadingSpeedItem(s.getItemType(), s.getWords(), s.getReadingSeconds(),
        ReadingSpeedService.wordsPerMinute(s.getWords(), s.getReadingSeconds()), s.getCreatedAt());
  }
}
