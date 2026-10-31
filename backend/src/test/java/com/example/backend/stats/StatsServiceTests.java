package com.example.backend.stats;

import com.example.backend.stats.dto.StatsSummary;
import com.example.backend.stats.dto.StatsSummary.SkillStats;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class StatsServiceTests {

  private static final LocalDate TODAY = LocalDate.of(2026, 11, 1);

  private static StudyLog log(String feature, String type, Integer correct, Integer total, int seconds,
      LocalDateTime at) {
    return new StudyLog(1L, feature, type, "x", correct, total, seconds, at);
  }

  @Test
  void summarizesBySkillTypeAndDay() {
    List<StudyLog> logs = List.of(
        log("grammar", "toeic-part5", 1, 1, 30, TODAY.atTime(8, 0)),
        log("reading", "toeic-part7", 2, 3, 300, TODAY.minusDays(1).atTime(21, 0)),
        log("listening", "toeic-part2", 4, 5, 120, TODAY.minusDays(10).atTime(7, 0)),
        log("writing", "eiken-opinion", 12, 16, 900, TODAY.atTime(9, 0)),
        log("speaking", "eiken-interview", null, null, 400, TODAY.minusDays(3).atTime(9, 0)));

    StatsSummary s = StatsService.summarize(logs, TODAY, Map.of());

    assertThat(s.today().sessions()).isEqualTo(2);
    assertThat(s.today().seconds()).isEqualTo(930);
    // ライティングの得点は正答率に混ぜない
    assertThat(s.today().total()).isEqualTo(1);

    SkillStats reading = s.skills().stream().filter(k -> k.skill().equals("reading")).findFirst().orElseThrow();
    assertThat(reading.week().sessions()).isEqualTo(2);
    assertThat(reading.week().correct()).isEqualTo(3);
    assertThat(reading.week().total()).isEqualTo(4);

    SkillStats listening = s.skills().stream().filter(k -> k.skill().equals("listening")).findFirst().orElseThrow();
    assertThat(listening.week().sessions()).isZero();
    assertThat(listening.month().sessions()).isEqualTo(1);

    assertThat(s.types()).extracting(StatsSummary.TypeStats::type)
        .containsExactlyInAnyOrder("toeic-part5", "toeic-part7", "toeic-part2", "eiken-opinion", "eiken-interview");

    assertThat(s.daily()).hasSize(StatsService.DAILY_DAYS);
    assertThat(s.daily().getLast().date()).isEqualTo("2026-11-01");
    assertThat(s.daily().getLast().seconds()).containsEntry("reading", 30).containsEntry("writing", 900);
  }

  @Test
  void clampsDuration() {
    assertThat(StudyLogService.clampDuration(null)).isZero();
    assertThat(StudyLogService.clampDuration(-5)).isZero();
    assertThat(StudyLogService.clampDuration(99999)).isEqualTo(StudyLogService.MAX_DURATION_SECONDS);
  }
}
