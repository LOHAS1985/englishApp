package com.example.backend.level;

import com.example.backend.stats.StatsService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.BiFunction;

/**
 * 経験値とレベルの計算規則。経験値は保存せず、学習ログ(study_logs)から毎回計算する
 * (規則を調整すると過去の記録にもそのまま反映される。ある日の経験値はその日までの記録だけで決まるので、
 * 後から過去の経験値が増減することはない)。
 *
 * <p>
 * 設計の目標:「1日30分を4技能にバランスよく使う」と、期限(2027年3月末)にちょうど Lv.100 になる。
 * <ul>
 * <li>解答:形式ごとに「1問にかかる時間」に比例した経験値(1分あたり約13XP)。難しい問題ほど多く、不正解でも少し入る</li>
 * <li>アウトプット(ライティング・スピーキング)は時間がかかるので、1分あたりが選択問題と同程度になるよう高めに付ける</li>
 * <li>同じ問題を同じ日に解き直しても経験値は入らない(易しい問題の繰り返しで稼げないように)</li>
 * <li>前回間違えた問題に後日全問正解すると 1.5倍(弱点の克服)</li>
 * <li>1日の学習時間・30分達成・取り組んだ技能の数にボーナス。連続日数に応じて最大1.3倍</li>
 * </ul>
 */
public final class XpRules {

  /** 期限と、期限までに Lv.100 にするための1日の目安 */
  public static final LocalDate START = LocalDate.of(2026, 11, 1);
  public static final LocalDate GOAL = LocalDate.of(2027, 3, 31);
  public static final int DAILY_TARGET_XP = 600;
  public static final int MAX_LEVEL = 100;
  /** Lv.100 に必要な累計経験値(= 1日の目安 × 期間の日数) */
  public static final long TOTAL_XP = (long) DAILY_TARGET_XP * (GOAL.toEpochDay() - START.toEpochDay() + 1);

  /** 標準の難易度で1問正解したときの経験値。1問にかかる時間の目安に比例させている */
  static final Map<String, Integer> BASE_XP = Map.ofEntries(
      Map.entry("vocab", 8),
      Map.entry("toeic-part5", 8),
      Map.entry("toeic-part2", 8),
      Map.entry("toeic-part3", 12),
      Map.entry("toeic-part4", 12),
      Map.entry("toeic-part6", 12),
      Map.entry("toeic-part7", 18),
      Map.entry("eiken-part1", 15),
      Map.entry("eiken-part2", 18),
      Map.entry("eiken-cloze", 22),
      Map.entry("eiken-part3", 22),
      Map.entry("eiken-long", 26));
  static final int DEFAULT_BASE_XP = 10;
  /** 不正解の設問も、取り組んだ分として基本の3割を与える(難しい問題への挑戦を避けさせない) */
  static final double WRONG_RATE = 0.3;
  static final double OVERCOME_RATE = 1.5;

  /** ライティングは得点(16点満点)× この値。意見論述は約20分、要約は約10分かかる */
  static final int OPINION_XP_PER_POINT = 15;
  static final int SUMMARY_XP_PER_POINT = 9;
  static final int SPEAKING_XP = 150;
  static final int ARTICLE_XP = 30;

  static final int TIME_XP_CAP_PER_DAY = 60;
  static final int GOAL_MINUTES = 30;
  static final int GOAL_BONUS = 50;
  static final int SKILL_BONUS = 10;
  /** 10分以上学習した日を連続日数に数える(1問だけで連続を保てないように) */
  static final int STREAK_MIN_SECONDS = 10 * 60;
  static final double STREAK_STEP = 0.02;
  static final int STREAK_MAX_STEPS = 15;

  private XpRules() {
  }

  /** 計算に使う学習ログ1件 */
  public record LogEntry(String feature, String type, String itemId, Integer correct, Integer total,
      int durationSeconds, LocalDateTime createdAt) {
  }

  /** 1日分の経験値の内訳。total = (answers + time + bonus) × multiplier */
  public record DayXp(LocalDate date, int answers, int time, int bonus, double multiplier, int total, int minutes,
      int skills, int streak) {
  }

  /**
   * 難易度 1〜5 の正解時の倍率。4・5 も 3 と同じ 1.3 倍にする(上限を上げると Lv.100 に届く時期の設計がずれるため。
   * 1.0 に落ちると難しい問題ほど経験値が減ってしまう)
   */
  static double difficultyRate(int difficulty) {
    if (difficulty <= 1) {
      return 0.8;
    }
    return difficulty >= 3 ? 1.3 : 1.0;
  }

  /** 1件の学習ログの解答分の経験値(同日の解き直し・克服ボーナスは calculate で扱う) */
  static int answerXp(LogEntry log, int difficulty) {
    return switch (log.type()) {
      case "eiken-opinion" -> score(log) * OPINION_XP_PER_POINT;
      case "eiken-summary" -> score(log) * SUMMARY_XP_PER_POINT;
      case "eiken-interview" -> SPEAKING_XP;
      case "guardian" -> ARTICLE_XP;
      // 模試は点数を測るための区切り。解答の経験値は与えず、かかった時間(時間 XP)だけを数える
      case "toeic-mock" -> 0;
      default -> {
        if (log.correct() == null || log.total() == null) {
          yield 0;
        }
        int base = BASE_XP.getOrDefault(log.type(), DEFAULT_BASE_XP);
        int wrong = Math.max(0, log.total() - log.correct());
        yield (int) Math.round(base * (log.correct() * difficultyRate(difficulty) + wrong * WRONG_RATE));
      }
    };
  }

  private static int score(LogEntry log) {
    return log.correct() == null ? 0 : Math.max(0, log.correct());
  }

  private static boolean allCorrect(LogEntry log) {
    return log.correct() != null && log.total() != null && log.total() > 0 && log.correct().equals(log.total());
  }

  /**
   * 日ごとの経験値を計算する。
   *
   * @param logs       学習ログ(古い順)
   * @param difficulty (形式, 問題ID) → 難易度 1〜5
   */
  public static Map<LocalDate, DayXp> calculate(List<LogEntry> logs, BiFunction<String, String, Integer> difficulty) {
    Map<LocalDate, int[]> raw = new TreeMap<>(); // 0: 解答, 1: 学習秒数
    Map<LocalDate, Set<String>> skills = new HashMap<>();
    Map<LocalDate, Set<String>> answeredToday = new HashMap<>();
    // 問題ごとの直前の結果(全問正解だったか)と、その日付
    Map<String, Boolean> lastAllCorrect = new HashMap<>();
    Map<String, LocalDate> lastDate = new HashMap<>();

    for (LogEntry log : logs) {
      LocalDate date = log.createdAt().toLocalDate();
      int[] day = raw.computeIfAbsent(date, d -> new int[2]);
      day[1] += Math.max(0, log.durationSeconds());
      skills.computeIfAbsent(date, d -> new HashSet<>()).add(StatsService.skillOf(log.feature()));

      String key = log.itemId() == null ? null : log.type() + ":" + log.itemId();
      if (key != null && !answeredToday.computeIfAbsent(date, d -> new HashSet<>()).add(key)) {
        continue; // 同じ日の解き直し
      }
      int xp = answerXp(log, difficulty.apply(log.type(), log.itemId()));
      boolean overcame = key != null && Boolean.FALSE.equals(lastAllCorrect.get(key))
          && lastDate.get(key).isBefore(date) && allCorrect(log);
      day[0] += overcame ? (int) Math.round(xp * OVERCOME_RATE) : xp;
      if (key != null && log.correct() != null && log.total() != null) {
        lastAllCorrect.put(key, allCorrect(log));
        lastDate.put(key, date);
      }
    }

    Map<LocalDate, DayXp> result = new TreeMap<>();
    int streak = 0;
    LocalDate previous = null;
    for (Map.Entry<LocalDate, int[]> e : raw.entrySet()) {
      LocalDate date = e.getKey();
      int seconds = e.getValue()[1];
      int minutes = seconds / 60;
      boolean counts = seconds >= STREAK_MIN_SECONDS;
      if (counts) {
        streak = previous != null && previous.plusDays(1).equals(date) ? streak + 1 : 1;
        previous = date;
      }
      int time = Math.min(minutes, TIME_XP_CAP_PER_DAY);
      int skillCount = skills.get(date).size();
      int bonus = (minutes >= GOAL_MINUTES ? GOAL_BONUS : 0) + skillCount * SKILL_BONUS;
      double multiplier = counts ? 1 + STREAK_STEP * Math.min(streak - 1, STREAK_MAX_STEPS) : 1;
      int total = (int) Math.round((e.getValue()[0] + time + bonus) * multiplier);
      result.put(date, new DayXp(date, e.getValue()[0], time, bonus, multiplier, total, minutes, skillCount,
          counts ? streak : 0));
    }
    return result;
  }

  /** レベル L(1〜100)に上がるのに必要な累計経験値。序盤は早く上がり、後半ほど1レベルに多く必要 */
  public static long xpForLevel(int level) {
    int l = Math.max(1, Math.min(MAX_LEVEL, level));
    return Math.round(TOTAL_XP * Math.pow((l - 1) / (double) (MAX_LEVEL - 1), 1.5));
  }

  public static int levelFor(long xp) {
    int level = 1;
    while (level < MAX_LEVEL && xpForLevel(level + 1) <= xp) {
      level++;
    }
    return level;
  }

  /** 予定どおりなら「今日の始まり」の時点で持っているはずの累計経験値 */
  public static long expectedXp(LocalDate today) {
    long days = Math.max(0, Math.min(today.toEpochDay(), GOAL.toEpochDay() + 1) - START.toEpochDay());
    return days * DAILY_TARGET_XP;
  }
}
