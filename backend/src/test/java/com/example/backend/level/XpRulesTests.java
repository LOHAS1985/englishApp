package com.example.backend.level;

import com.example.backend.level.XpRules.DayXp;
import com.example.backend.level.XpRules.LogEntry;
import com.example.backend.level.dto.LevelSummary;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class XpRulesTests {

  private static final LocalDate DAY = LocalDate.of(2026, 11, 2);

  @Test
  void mockSectionGivesNoAnswerXpButStillCountsTime() {
    // 模試は点数を測る区切りなので、正解で経験値を稼げないようにする(時間の経験値は別に入る)
    assertThat(XpRules.answerXp(log("listening", "toeic-mock", "mock-1", 80, 94, 2700, DAY), 2)).isZero();
    assertThat(XpRules.answerXp(log("listening", "toeic-part2", "x", 4, 5, 0, DAY), 2)).isPositive();
  }

  private static LogEntry log(String feature, String type, String id, Integer correct, Integer total, int seconds,
      LocalDate date) {
    return new LogEntry(feature, type, id, correct, total, seconds, date.atTime(20, 0));
  }

  private static Map<LocalDate, DayXp> calc(List<LogEntry> logs) {
    return XpRules.calculate(logs, (type, id) -> 2);
  }

  @Test
  void answerXpDependsOnFormatDifficultyAndCorrectness() {
    assertThat(XpRules.answerXp(log("vocab", "vocab", "v1", 1, 1, 20, DAY), 3)).isEqualTo(10);
    assertThat(XpRules.answerXp(log("vocab", "vocab", "v1", 1, 1, 20, DAY), 1)).isEqualTo(6);
    assertThat(XpRules.answerXp(log("vocab", "vocab", "v1", 0, 1, 20, DAY), 3)).as("不正解でも少し入る").isEqualTo(2);
    assertThat(XpRules.answerXp(log("reading", "toeic-part7", "r1", 3, 4, 300, DAY), 2)).isEqualTo(59);
    assertThat(XpRules.answerXp(log("writing", "eiken-opinion", "w1", 10, 16, 1200, DAY), 2)).isEqualTo(150);
    assertThat(XpRules.answerXp(log("speaking", "eiken-interview", "s1", null, null, 600, DAY), 2)).isEqualTo(150);
  }

  @Test
  void repeatingTheSameQuestionOnTheSameDayGivesNoAnswerXp() {
    DayXp day = calc(List.of(
        log("vocab", "vocab", "v1", 1, 1, 20, DAY),
        log("vocab", "vocab", "v1", 1, 1, 20, DAY))).get(DAY);
    assertThat(day.answers()).isEqualTo(8);
  }

  @Test
  void correctingAPreviousMistakeOnALaterDayGivesABonus() {
    LocalDate next = DAY.plusDays(1);
    Map<LocalDate, DayXp> days = calc(List.of(
        log("grammar", "toeic-part5", "g1", 0, 1, 20, DAY),
        log("grammar", "toeic-part5", "g1", 1, 1, 20, next)));
    assertThat(days.get(next).answers()).isEqualTo(12);
  }

  @Test
  void dailyBonusesAndStreakMultiplier() {
    List<LogEntry> logs = new ArrayList<>();
    for (int i = 0; i < 3; i++) {
      // 3日連続で、語彙とリスニングを合わせて30分
      LocalDate d = DAY.plusDays(i);
      logs.add(log("vocab", "vocab", "v" + i, 1, 1, 900, d));
      logs.add(log("listening", "toeic-part3", "l" + i, 3, 3, 900, d));
    }
    DayXp third = calc(logs).get(DAY.plusDays(2));
    assertThat(third.streak()).isEqualTo(3);
    assertThat(third.time()).isEqualTo(30);
    assertThat(third.bonus()).as("30分達成 50 + 2技能 × 10").isEqualTo(70);
    assertThat(third.multiplier()).isCloseTo(1.04, within(1e-9));
    assertThat(third.total()).isEqualTo((int) Math.round((8 + 36 + 30 + 70) * 1.04));
  }

  @Test
  void shortDaysDoNotCountTowardTheStreak() {
    Map<LocalDate, DayXp> days = calc(List.of(
        log("vocab", "vocab", "v1", 1, 1, 900, DAY),
        log("vocab", "vocab", "v2", 1, 1, 60, DAY.plusDays(1)),
        log("vocab", "vocab", "v3", 1, 1, 900, DAY.plusDays(2))));
    assertThat(days.get(DAY.plusDays(1)).streak()).isZero();
    assertThat(days.get(DAY.plusDays(2)).streak()).isEqualTo(1);
  }

  @Test
  void levelCurveReachesOneHundredAtTheTotal() {
    assertThat(XpRules.xpForLevel(1)).isZero();
    assertThat(XpRules.xpForLevel(100)).isEqualTo(XpRules.TOTAL_XP);
    for (int l = 1; l < 100; l++) {
      assertThat(XpRules.xpForLevel(l + 1)).isGreaterThan(XpRules.xpForLevel(l));
    }
    assertThat(XpRules.levelFor(0)).isEqualTo(1);
    assertThat(XpRules.levelFor(XpRules.TOTAL_XP)).isEqualTo(100);
    assertThat(XpRules.levelFor(XpRules.TOTAL_XP * 2)).isEqualTo(100);
  }

  /** 標準的な30分ちょうど(語彙・文法各10問、Part 7、Part 3 ×2、英検 大問3)を毎日続けると、期限にほぼ Lv.100 になる */
  @Test
  void aTypicalThirtyMinuteDayKeepsPaceWithTheGoal() {
    List<LogEntry> logs = new ArrayList<>();
    long days = XpRules.GOAL.toEpochDay() - XpRules.START.toEpochDay() + 1;
    for (int i = 0; i < days; i++) {
      LocalDate d = XpRules.START.plusDays(i);
      for (int q = 0; q < 10; q++) {
        logs.add(log("vocab", "vocab", "v" + i + "-" + q, q < 8 ? 1 : 0, 1, 20, d));
        logs.add(log("grammar", "toeic-part5", "g" + i + "-" + q, q < 8 ? 1 : 0, 1, 25, d));
      }
      logs.add(log("reading", "toeic-part7", "r" + i, 3, 4, 480, d));
      logs.add(log("listening", "toeic-part3", "la" + i, 2, 3, 120, d));
      logs.add(log("listening", "toeic-part3", "lb" + i, 3, 3, 120, d));
      logs.add(log("reading", "eiken-long", "re" + i, 3, 4, 630, d));
    }
    Map<LocalDate, DayXp> result = calc(logs);
    int steadyDay = result.get(XpRules.GOAL).total();
    assertThat(steadyDay).as("連続日数が最大になった後の1日").isBetween(540, 660);
    long total = result.values().stream().mapToLong(DayXp::total).sum();
    assertThat(XpRules.levelFor(total)).isBetween(97, 100);
  }

  @Test
  void summaryReportsPaceAgainstTheGoal() {
    LocalDate today = XpRules.START.plusDays(10);
    Map<LocalDate, DayXp> none = Map.of();
    LevelSummary s = LevelService.summarize(none, today);
    assertThat(s.level()).isEqualTo(1);
    assertThat(s.expectedXp()).isEqualTo(10L * XpRules.DAILY_TARGET_XP);
    assertThat(s.pace()).isEqualTo("behind");
    assertThat(s.daysLeft()).isEqualTo(XpRules.GOAL.toEpochDay() - today.toEpochDay() + 1);
    assertThat(s.xpPerDayToGoal() * s.daysLeft()).isGreaterThanOrEqualTo(XpRules.TOTAL_XP);
    assertThat(s.recentDays()).hasSize(LevelService.RECENT_DAYS);
  }
}
