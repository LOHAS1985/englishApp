package com.example.backend.wordbook;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.function.ToIntFunction;

/**
 * 単語帳の出題の選び方。優先順は次のとおり。
 * <ol>
 * <li>色を決めていない語(無色)で、まだ一度も出していない語。一周目としてすべて先に出す
 *     (利用者の要望で、復習より先にする。復習日が来た語は一周目が終わるまで待つ)</li>
 * <li>復習日が来た語(間違えた語など)</li>
 * <li>残りのまだ出していない語(色付き)。色の重みで選ぶ</li>
 * <li>どれも無いとき、次の復習日がまだ先の語を色の重みで選ぶ</li>
 * </ol>
 * ホームに戻るまでに出した語(exclude)は出さない。無色の語は一度出すと一周目から外れるので、同じ語が一周目で繰り返されることはない。
 */
final class WordbookPicker {

  /** ホームに戻るまでに、出せる語をすべて出したとき(画面の shared/sessionSeen.ts の文言と揃える) */
  static final String ALL_SHOWN_MESSAGE =
      "この形式の問題は、ホームに戻るまでにすべて出しました。ホームに戻ると、また出題できます。";

  private WordbookPicker() {
  }

  /**
   * @param exclude ホームに戻るまでに出した語の ID(画面が送る)。利用者の要望で、これらは出し直さない
   * @param today   今日の日付(日本時間)。復習日が来ているかの判定に使う
   * @throws IllegalArgumentException 出題できる語が1つも無いとき
   */
  static WordbookWord pick(List<WordbookWord> candidates, Set<Long> exclude, LocalDate today, Random random) {
    if (candidates.isEmpty()) {
      throw new IllegalArgumentException("出題できる単語がありません");
    }
    List<WordbookWord> pool = candidates.stream().filter(w -> !exclude.contains(w.getId())).toList();
    if (pool.isEmpty()) {
      throw new IllegalArgumentException(ALL_SHOWN_MESSAGE);
    }
    List<WordbookWord> due = pool.stream().filter(w -> w.isDue(today)).toList();
    List<WordbookWord> uncoloredUnseen = pool.stream()
        .filter(w -> w.getColor() == WordbookColor.NONE && w.isUnseen()).toList();
    List<WordbookWord> unseen = pool.stream().filter(WordbookWord::isUnseen).toList();

    if (!uncoloredUnseen.isEmpty()) {
      // 一周目は、色を決めていない語を一様に(色で重みを付けない。どれも無色のため)
      return uncoloredUnseen.get(random.nextInt(uncoloredUnseen.size()));
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
   * 品詞が分かる語は、同じ品詞(動詞は「を〜」の有無まで)の語の訳を優先する
   * (訳の形だけで選択肢を絞れないようにする)。正解と訳の一部が重なる語(類義語)の訳は、足りる限り避ける。
   * @throws IllegalArgumentException 候補が足りないとき
   */
  static List<String> distractors(WordbookWord correct, List<WordbookWord> others, int count, Random random) {
    List<WordbookWord> candidates = others.stream()
        .filter(w -> !WordForms.sameWord(w.getWord(), correct.getWord()))
        .filter(w -> w.getMeaningJa() != null && !w.getMeaningJa().isBlank()
            && !w.getMeaningJa().equals(correct.getMeaningJa()))
        .toList();
    // 類義語の訳を避けた候補だけで足りればそれを使い、足りなければ(単語帳が小さいとき)重なりを許す
    List<WordbookWord> distinctMeaning = candidates.stream()
        .filter(w -> !overlaps(w.getMeaningJa(), correct.getMeaningJa())).toList();
    List<String> picked = pickMeanings(correct, distinctMeaning, count, random);
    if (picked.size() < count) {
      picked = pickMeanings(correct, candidates, count, random);
    }
    if (picked.size() < count) {
      throw new IllegalArgumentException("4択の選択肢に必要な単語が足りません");
    }
    return picked;
  }

  /** 同じ品詞の語の訳を先に、足りなければほかの語の訳から、重複なしで count 個まで選ぶ */
  private static List<String> pickMeanings(WordbookWord correct, List<WordbookWord> candidates, int count,
      Random random) {
    String group = group(correct);
    List<String> same = new ArrayList<>();
    List<String> other = new ArrayList<>();
    for (WordbookWord w : candidates) {
      boolean sameGroup = group != null && group.equals(group(w));
      List<String> target = sameGroup ? same : other;
      if (!target.contains(w.getMeaningJa())) {
        target.add(w.getMeaningJa());
      }
    }
    Collections.shuffle(same, random);
    Collections.shuffle(other, random);
    List<String> picked = new ArrayList<>(same.subList(0, Math.min(count, same.size())));
    for (String meaning : other) {
      if (picked.size() >= count) {
        break;
      }
      if (!picked.contains(meaning)) {
        picked.add(meaning);
      }
    }
    return List.copyOf(picked);
  }

  /** 誤答を選ぶときの品詞のまとまり。品詞が分からない語は null。動詞は、訳が「を」で始まる語(他動詞)と分ける */
  static String group(WordbookWord w) {
    if (w.getPos() == null) {
      return null;
    }
    boolean transitive = "v".equals(w.getPos()) && w.getMeaningJa() != null && w.getMeaningJa().startsWith("を");
    return transitive ? "v:を" : w.getPos();
  }

  /** 2つの訳が、同じ意味の言い方を含むか(「、」区切りの言い方のどれかが、先頭の「を」「に」を除いて一致する) */
  static boolean overlaps(String a, String b) {
    java.util.Set<String> keys = meaningKeys(a);
    for (String key : meaningKeys(b)) {
      if (keys.contains(key)) {
        return true;
      }
    }
    return false;
  }

  private static java.util.Set<String> meaningKeys(String meaning) {
    java.util.Set<String> keys = new java.util.HashSet<>();
    if (meaning == null) {
      return keys;
    }
    for (String part : meaning.split("、")) {
      String key = part.replaceAll("[(（].*?[)）]", "").trim();
      if (key.startsWith("を") || key.startsWith("に")) {
        key = key.substring(1);
      }
      if (!key.isEmpty()) {
        keys.add(key);
      }
    }
    return keys;
  }
}
