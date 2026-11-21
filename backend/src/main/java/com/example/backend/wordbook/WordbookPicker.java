package com.example.backend.wordbook;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.function.ToIntFunction;
import java.util.stream.Collectors;

/**
 * 単語帳の出題の選び方。復習日が来た語と、まだ出していない語(新規)を混ぜて出し、
 * どちらも無いときは次の復習日がまだ先の語から選ぶ。直近に出した語は避ける。
 * 新規の語を先に出すので、全部の語を一度は出してから同じ語が繰り返される(復習日が来た語を除く)。
 */
final class WordbookPicker {

  /** 復習日が来た語と新規の語の両方があるとき、復習日が来た語を選ぶ確率(%)。残りは新規 */
  static final int DUE_SHARE_PERCENT = 60;

  private WordbookPicker() {
  }

  /**
   * @param exclude 直近に出した語の ID。候補がこれだけになったら、除外を外して選ぶ
   * @param today   今日の日付(日本時間)。復習日が来ているかの判定に使う
   * @throws IllegalArgumentException 出題できる語が1つも無いとき
   */
  static WordbookWord pick(List<WordbookWord> candidates, Set<Long> exclude, LocalDate today, Random random) {
    if (candidates.isEmpty()) {
      throw new IllegalArgumentException("出題できる単語がありません");
    }
    List<WordbookWord> pool = candidates.stream().filter(w -> !exclude.contains(w.getId())).toList();
    if (pool.isEmpty()) {
      pool = candidates;
    }
    List<WordbookWord> due = pool.stream().filter(w -> w.isDue(today)).toList();
    List<WordbookWord> unseen = pool.stream().filter(WordbookWord::isUnseen).toList();

    if (!due.isEmpty() && !unseen.isEmpty()) {
      return random.nextInt(100) < DUE_SHARE_PERCENT
          ? weighted(due, w -> w.getColor().dueWeight(), random)
          : weighted(unseen, w -> w.getColor().newWeight(), random);
    }
    if (!due.isEmpty()) {
      return weighted(due, w -> w.getColor().dueWeight(), random);
    }
    if (!unseen.isEmpty()) {
      return weighted(unseen, w -> w.getColor().newWeight(), random);
    }
    return weighted(pool, w -> w.getColor().weight(), random);
  }

  private static WordbookWord weighted(List<WordbookWord> words, ToIntFunction<WordbookWord> weight, Random random) {
    int total = words.stream().mapToInt(weight).sum();
    int roll = random.nextInt(total);
    for (WordbookWord word : words) {
      roll -= weight.applyAsInt(word);
      if (roll < 0) {
        return word;
      }
    }
    return words.get(words.size() - 1);
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
