package com.example.backend.common;

import com.example.backend.stats.StudyLogService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 採点の点数と、画面から送られた秒数を範囲に収める処理(ライティング・スピーキング・学習ログ・模試で共通) */
class EikenScoresTests {

  @Test
  void criterionScoresAreKeptWithinZeroToFour() {
    assertThat(EikenScores.clampCriterion(-1)).isZero();
    assertThat(EikenScores.clampCriterion(3)).isEqualTo(3);
    assertThat(EikenScores.clampCriterion(9)).isEqualTo(4);
    assertThat(EikenScores.MAX_TOTAL).isEqualTo(16);
  }

  @Test
  void secondsAreKeptWithinZeroToMax() {
    assertThat(StudyLogService.clampSeconds(null, 100)).isZero();
    assertThat(StudyLogService.clampSeconds(-5, 100)).isZero();
    assertThat(StudyLogService.clampSeconds(50, 100)).isEqualTo(50);
    assertThat(StudyLogService.clampSeconds(500, 100)).isEqualTo(100);
  }
}
