package com.example.backend.wordbook;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

/** 単語帳の出題の選び方。色ごとの重みで選び、直近に出した語は避ける */
final class WordbookPicker {

  private WordbookPicker() {
  }

  /**
   * @param exclude 直近に出した語の ID。候補がこれだけになったら、除外を外して選ぶ
   * @throws IllegalArgumentException 出題できる語が1つも無いとき
   */
  static WordbookWord pick(List<WordbookWord> candidates, Set<Long> exclude, Random random) {
    if (candidates.isEmpty()) {
      throw new IllegalArgumentException("出題できる単語がありません");
    }
    List<WordbookWord> pool = candidates.stream().filter(w -> !exclude.contains(w.getId())).toList();
    if (pool.isEmpty()) {
      pool = candidates;
    }
    int total = pool.stream().mapToInt(w -> w.getColor().weight()).sum();
    int roll = random.nextInt(total);
    for (WordbookWord word : pool) {
      roll -= word.getColor().weight();
      if (roll < 0) {
        return word;
      }
    }
    return pool.get(pool.size() - 1);
  }

  /**
   * 4択の誤答。正解と同じ訳、同じ語の訳は避け、重複しない訳を count 個選ぶ。
   * @throws IllegalArgumentException 候補が足りないとき
   */
  static List<String> distractors(WordbookWord correct, List<WordbookWord> others, int count, Random random) {
    List<String> meanings = others.stream()
        .filter(w -> !WordForms.sameWord(w.getWord(), correct.getWord()))
        .map(WordbookWord::getMeaningJa)
        .filter(m -> m != null && !m.isBlank() && !m.equals(correct.getMeaningJa()))
        .distinct()
        .collect(Collectors.toCollection(ArrayList::new));
    if (meanings.size() < count) {
      throw new IllegalArgumentException("4択の選択肢に必要な単語が足りません");
    }
    Collections.shuffle(meanings, random);
    return List.copyOf(meanings.subList(0, count));
  }
}
