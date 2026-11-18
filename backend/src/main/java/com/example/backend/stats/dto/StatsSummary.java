package com.example.backend.stats.dto;

import com.example.backend.review.ReviewService.ReviewSummary;

import java.util.List;
import java.util.Map;

/** マイページ・ホームに出す学習量の集計 */
public record StatsSummary(
    Totals today,
    List<SkillStats> skills,
    List<TypeStats> types,
    List<DailyStats> daily,
    Map<String, ReviewSummary> review) {

  /** 回数・学習秒数・正解数/設問数(正誤のあるものだけ) */
  public record Totals(int sessions, int seconds, int correct, int total) {
  }

  /** skill: listening / reading / writing / speaking / vocab */
  public record SkillStats(String skill, Totals week, Totals month) {
  }

  /** 形式別の成績。month は直近30日(弱点の把握用)、week は直近7日(ホームの今週の学習量用)。skill は形式が属する技能 */
  public record TypeStats(String type, String skill, Totals week, Totals month) {
  }

  /** date: yyyy-MM-dd(日本時間)。seconds は技能ごとの学習秒数 */
  public record DailyStats(String date, Map<String, Integer> seconds) {
  }
}
