package com.example.backend.wordbook.dto;

import java.util.List;

/**
 * 単語帳の学習状況(出題できる語だけを数える)。
 * 習熟度は、未学習(まだ一度も出していない)・学習中(復習の段階 0〜1)・定着(段階 2 以上。7日以上空けて正解した)
 */
public record StatsView(
    long total,
    long unseen,
    long learning,
    long mastered,
    /** 直近7日の解答数と、そのうち正解した数 */
    int recentAsked,
    int recentCorrect,
    /** 苦手な語(2回以上出して、正答率が低い順。最大10語) */
    List<WeakWord> weakest) {

  public record WeakWord(Long id, String word, String meaningJa, int timesAsked, int timesCorrect) {
  }
}
