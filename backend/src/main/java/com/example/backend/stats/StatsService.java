package com.example.backend.stats;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.review.ReviewService;
import com.example.backend.review.ReviewService.ReviewSummary;
import com.example.backend.stats.dto.StatsSummary;
import com.example.backend.stats.dto.StatsSummary.DailyStats;
import com.example.backend.stats.dto.StatsSummary.SkillStats;
import com.example.backend.stats.dto.StatsSummary.Totals;
import com.example.backend.stats.dto.StatsSummary.TypeStats;
import com.example.backend.stats.dto.StudyLogItem;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

/** 学習ログを技能別・形式別・日別に集計する */
@Service
public class StatsService {

  /** 4技能+語彙。文法(TOEIC Part 5)はリーディングに含める */
  public static final List<String> SKILLS = List.of("listening", "reading", "writing", "speaking", "vocab");

  static final int DAILY_DAYS = 14;

  private final StudyLogRepository repository;
  private final CurrentUserProvider currentUserProvider;
  private final ReviewService reviewService;

  public StatsService(StudyLogRepository repository, CurrentUserProvider currentUserProvider,
      ReviewService reviewService) {
    this.repository = repository;
    this.currentUserProvider = currentUserProvider;
    this.reviewService = reviewService;
  }

  public static String skillOf(String feature) {
    return "grammar".equals(feature) ? "reading" : feature;
  }

  public StatsSummary summary() {
    LocalDate today = LocalDate.now(StudyLogService.JST);
    List<StudyLog> logs = repository.findByUserIdAndCreatedAtGreaterThanEqual(
        currentUserProvider.getCurrentUserId(), today.minusDays(29).atStartOfDay());
    return summarize(logs, today, reviewService.summary());
  }

  static StatsSummary summarize(List<StudyLog> logs, LocalDate today,
      Map<String, ReviewSummary> review) {
    LocalDateTime todayStart = today.atStartOfDay();
    LocalDateTime weekStart = today.minusDays(6).atStartOfDay();

    List<SkillStats> skills = new ArrayList<>();
    for (String skill : SKILLS) {
      Predicate<StudyLog> isSkill = l -> skill.equals(skillOf(l.getFeature()));
      skills.add(new SkillStats(skill,
          totals(logs, isSkill.and(l -> !l.getCreatedAt().isBefore(weekStart))),
          totals(logs, isSkill)));
    }

    Map<String, List<StudyLog>> byType = new LinkedHashMap<>();
    for (StudyLog l : logs) {
      byType.computeIfAbsent(l.getItemType(), k -> new ArrayList<>()).add(l);
    }
    List<TypeStats> types = byType.entrySet().stream()
        .map(e -> new TypeStats(e.getKey(), totals(e.getValue(), l -> true)))
        .toList();

    List<DailyStats> daily = new ArrayList<>();
    for (int i = DAILY_DAYS - 1; i >= 0; i--) {
      LocalDate date = today.minusDays(i);
      Map<String, Integer> seconds = new LinkedHashMap<>();
      for (String skill : SKILLS) {
        seconds.put(skill, 0);
      }
      for (StudyLog l : logs) {
        if (l.getCreatedAt().toLocalDate().equals(date)) {
          seconds.merge(skillOf(l.getFeature()), l.getDurationSeconds(), Integer::sum);
        }
      }
      daily.add(new DailyStats(date.toString(), seconds));
    }

    return new StatsSummary(totals(logs, l -> !l.getCreatedAt().isBefore(todayStart)), skills, types, daily, review);
  }

  static Totals totals(List<StudyLog> logs, Predicate<StudyLog> filter) {
    int sessions = 0;
    int seconds = 0;
    int correct = 0;
    int total = 0;
    for (StudyLog l : logs) {
      if (!filter.test(l)) {
        continue;
      }
      sessions++;
      seconds += l.getDurationSeconds();
      // ライティングの得点は正答率に混ぜない(16点満点の得点で別に見る)
      if (l.getCorrectCount() != null && l.getTotalCount() != null && !"writing".equals(l.getFeature())) {
        correct += l.getCorrectCount();
        total += l.getTotalCount();
      }
    }
    return new Totals(sessions, seconds, correct, total);
  }

  public List<StudyLogItem> recent() {
    return repository.findTop50ByUserIdOrderByIdDesc(currentUserProvider.getCurrentUserId()).stream()
        .map(StudyLogItem::from)
        .toList();
  }
}
