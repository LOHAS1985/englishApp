package com.example.backend.common;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * 解答履歴をもとに次の問題を選ぶ。
 * <ul>
 * <li>一巡するまで重複なし:解答回数が最も少ない問題から選ぶ(全問解くと次の周に入る)</li>
 * <li>間違えた問題を優先:最後の解答が不正解の問題を {@link #REVIEW_RATE} の確率で出し直す</li>
 * <li>直近に解いた問題と、画面に表示中の問題(exclude)は続けて出さない</li>
 * </ul>
 */
public final class QuestionPicker {

  /** 復習(最後に間違えた問題)を出す確率 */
  static final double REVIEW_RATE = 0.3;
  /** 直近に解いたこの数の問題は、復習でも出さない */
  static final int RECENT_LIMIT = 5;

  /**
   * 1回分の解答。correct は正誤のない問題(スピーキングの出題記録など)では null
   */
  public record Attempt(String itemId, Boolean correct) {
  }

  private QuestionPicker() {
  }

  /**
   * @param candidates 出題候補の ID
   * @param history    解答履歴(新しい順)
   * @param exclude    出さない ID(画面に表示中の問題)。null 可
   */
  public static String pick(List<String> candidates, List<Attempt> history, String exclude, Random random) {
    if (candidates.isEmpty()) {
      throw new IllegalArgumentException("問題が登録されていません");
    }
    Set<String> candidateSet = new HashSet<>(candidates);
    Map<String, Integer> counts = new HashMap<>();
    Map<String, Boolean> latest = new HashMap<>();
    Set<String> recent = new HashSet<>();
    int recentLimit = Math.min(RECENT_LIMIT, candidates.size() / 3);
    for (Attempt a : history) {
      if (!candidateSet.contains(a.itemId())) {
        continue;
      }
      counts.merge(a.itemId(), 1, Integer::sum);
      latest.putIfAbsent(a.itemId(), a.correct());
      if (recent.size() < recentLimit) {
        recent.add(a.itemId());
      }
    }

    Set<String> blocked = new HashSet<>(recent);
    if (exclude != null) {
      blocked.add(exclude);
    }

    List<String> review = candidates.stream()
        .filter(id -> Boolean.FALSE.equals(latest.get(id)) && !blocked.contains(id))
        .toList();
    if (!review.isEmpty() && random.nextDouble() < REVIEW_RATE) {
      return review.get(random.nextInt(review.size()));
    }

    List<String> pool = leastAnswered(candidates, counts, blocked);
    if (pool.isEmpty()) {
      // 候補が少なく直近の問題ですべて埋まる場合は、表示中の問題だけを避ける
      pool = leastAnswered(candidates, counts, exclude == null ? Set.of() : Set.of(exclude));
    }
    if (pool.isEmpty()) {
      pool = candidates;
    }
    return pool.get(random.nextInt(pool.size()));
  }

  private static List<String> leastAnswered(List<String> candidates, Map<String, Integer> counts,
      Set<String> blocked) {
    int min = Integer.MAX_VALUE;
    List<String> pool = new ArrayList<>();
    for (String id : candidates) {
      if (blocked.contains(id)) {
        continue;
      }
      int c = counts.getOrDefault(id, 0);
      if (c < min) {
        min = c;
        pool.clear();
      }
      if (c == min) {
        pool.add(id);
      }
    }
    return pool;
  }
}
