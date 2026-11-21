package com.example.backend.stats;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** 解答時刻と再送判定用 ID の検査(画面の送信待ちの列が付ける値を、信用しすぎないため) */
class StudyLogServiceTests {

  private static final Instant NOW = Instant.parse("2026-11-21T03:00:00Z"); // 日本時間 12:00

  @Test
  void answeredAtIsConvertedToJapanTime() {
    // 23:50(日本時間)に解いて、翌日に届いた解答は、解いた日に数える
    Instant answered = Instant.parse("2026-11-20T14:50:00Z");
    assertThat(StudyLogService.answeredAt(answered, NOW)).isEqualTo(LocalDateTime.of(2026, 11, 20, 23, 50));
  }

  @Test
  void missingAnsweredAtFallsBackToNow() {
    assertThat(StudyLogService.answeredAt(null, NOW)).isEqualTo(LocalDateTime.of(2026, 11, 21, 12, 0));
  }

  @Test
  void answeredAtOutsideThePlausibleRangeFallsBackToNow() {
    LocalDateTime now = LocalDateTime.of(2026, 11, 21, 12, 0);
    // 7日より前(端末の時計のずれ・古い送信待ち)
    assertThat(StudyLogService.answeredAt(NOW.minusSeconds(7 * 24 * 3600 + 1), NOW)).isEqualTo(now);
    assertThat(StudyLogService.answeredAt(NOW.minusSeconds(7 * 24 * 3600), NOW)).isEqualTo(now.minusDays(7));
    // 未来(5分までの時計のずれは許す)
    assertThat(StudyLogService.answeredAt(NOW.plusSeconds(5 * 60 + 1), NOW)).isEqualTo(now);
    assertThat(StudyLogService.answeredAt(NOW.plusSeconds(5 * 60), NOW)).isEqualTo(now.plusMinutes(5));
  }

  @Test
  void requestIdIsTrimmedAndBlankOrTooLongIdsAreIgnored() {
    assertThat(StudyLogService.normalizeRequestId(" abc-1 ")).isEqualTo("abc-1");
    assertThat(StudyLogService.normalizeRequestId(null)).isNull();
    assertThat(StudyLogService.normalizeRequestId("   ")).isNull();
    assertThat(StudyLogService.normalizeRequestId("x".repeat(64))).hasSize(64);
    // 列の長さを超えると保存に失敗するので、付けなかったものとして扱う
    assertThat(StudyLogService.normalizeRequestId("x".repeat(65))).isNull();
  }
}
