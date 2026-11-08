package com.example.backend.mock;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;

class MockSelectionTests {

  @Test
  void picksSetsWhoseQuestionCountAddsUpToTheTarget() {
    // 設問数が 2〜5 でばらつく候補からも、目標の合計に合わせられる
    List<Integer> sizes = List.of(2, 3, 3, 4, 4, 5, 2, 3, 4, 3, 5, 2, 4, 3, 3);
    for (long seed = 0; seed < 20; seed++) {
      List<Integer> chosen = MockSelection.chooseToTotal(sizes, 20, s -> s, new Random(seed));
      assertThat(chosen.stream().mapToInt(Integer::intValue).sum()).as("seed=%d", seed).isEqualTo(20);
    }
  }

  @Test
  void picksNothingWhenThereAreNoCandidates() {
    assertThat(MockSelection.chooseToTotal(List.<Integer>of(), 10, s -> s, new Random(1))).isEmpty();
  }

  @Test
  void returnsTheClosestCombinationWhenTheTargetCannotBeReached() {
    // 合計 7 にはできない(偶数だけ)。超えない範囲で一番近い 6 を選ぶ
    List<Integer> sizes = List.of(2, 2, 2, 4);
    List<Integer> chosen = MockSelection.chooseToTotal(sizes, 7, s -> s, new Random(3));
    assertThat(chosen.stream().mapToInt(Integer::intValue).sum()).isEqualTo(6);
  }
}
