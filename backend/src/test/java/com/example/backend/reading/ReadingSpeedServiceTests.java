package com.example.backend.reading;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReadingSpeedServiceTests {

  @Test
  void countsWordsSeparatedByWhitespace() {
    assertThat(ReadingSpeedService.countWords("The sale [1] starts now.\n  Sign up today.")).isEqualTo(8);
    assertThat(ReadingSpeedService.countWords("  ")).isZero();
    assertThat(ReadingSpeedService.countWords(null)).isZero();
  }

  @Test
  void wordsPerMinuteRoundsToTheNearestWord() {
    // 300 語を 90 秒で読んだら 200 語/分
    assertThat(ReadingSpeedService.wordsPerMinute(300, 90)).isEqualTo(200);
    assertThat(ReadingSpeedService.wordsPerMinute(100, 70)).isEqualTo(86);
    assertThat(ReadingSpeedService.wordsPerMinute(100, 0)).isZero();
  }

  @Test
  void onlyPlausibleReadingTimesAreMeasured() {
    assertThat(ReadingSpeedService.isMeasurable(null)).isFalse();
    // 押し忘れ(短すぎる)と放置(長すぎる)は記録しない
    assertThat(ReadingSpeedService.isMeasurable(9)).isFalse();
    assertThat(ReadingSpeedService.isMeasurable(10)).isTrue();
    assertThat(ReadingSpeedService.isMeasurable(30 * 60)).isTrue();
    assertThat(ReadingSpeedService.isMeasurable(30 * 60 + 1)).isFalse();
  }
}
