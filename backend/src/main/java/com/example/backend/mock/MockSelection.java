package com.example.backend.mock;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.function.ToIntFunction;

/**
 * 模試で使う問題(セット)の組み合わせを選ぶ。TOEIC は1つの長文・音声に3問や5問が付くので、
 * 区切りの問題数(例: Part 3 は39問)をできるだけ正確に合わせるため、無作為に組み直して合計が合うものを探す。
 */
final class MockSelection {

  /** 合計が合うものが見つかるまで組み直す回数。見つからなければ一番近いものを使う */
  static final int ATTEMPTS = 200;

  private MockSelection() {
  }

  /**
   * @param candidates     候補(セット)
   * @param targetQuestions 欲しい設問数の合計
   * @param questionsOf    セットの設問数
   * @return 選んだセット。合計が目標に一番近い組み合わせ
   */
  static <T> List<T> chooseToTotal(List<T> candidates, int targetQuestions, ToIntFunction<T> questionsOf,
      Random random) {
    List<T> best = List.of();
    int bestGap = Integer.MAX_VALUE;
    for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
      List<T> shuffled = new ArrayList<>(candidates);
      Collections.shuffle(shuffled, random);
      List<T> chosen = new ArrayList<>();
      int sum = 0;
      for (T candidate : shuffled) {
        int size = questionsOf.applyAsInt(candidate);
        if (sum + size <= targetQuestions) {
          chosen.add(candidate);
          sum += size;
          if (sum == targetQuestions) {
            break;
          }
        }
      }
      int gap = targetQuestions - sum;
      if (gap < bestGap) {
        best = chosen;
        bestGap = gap;
      }
      if (gap == 0) {
        break;
      }
    }
    return best;
  }
}
