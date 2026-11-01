package com.example.backend.level.dto;

import java.util.List;

/**
 * レベルと学習ペース(画面のヘッダー・マイページ用)。
 *
 * @param levelStartXp  今のレベルに上がった累計経験値
 * @param nextLevelXp   次のレベルに必要な累計経験値(Lv.100 なら null)
 * @param expectedXp    予定どおりなら今日の始まりに持っているはずの累計経験値
 * @param expectedLevel expectedXp に相当するレベル
 * @param pace          ahead(予定以上) / onTrack(1日分以内の遅れ) / behind(それ以上の遅れ)
 * @param xpPerDayToGoal 期限に Lv.100 になるために、今日から1日あたり必要な経験値
 */
public record LevelSummary(
    int level,
    int maxLevel,
    long totalXp,
    long levelStartXp,
    Long nextLevelXp,
    Today today,
    int streakDays,
    int dailyTargetXp,
    long expectedXp,
    int expectedLevel,
    String pace,
    long xpPerDayToGoal,
    long daysLeft,
    String goalDate,
    List<DayPoint> recentDays) {

  /** 今日の経験値の内訳。total = (answers + time + bonus) × multiplier */
  public record Today(int total, int answers, int time, int bonus, double multiplier, int minutes, int skills) {
  }

  public record DayPoint(String date, int xp) {
  }
}
