package com.example.backend.mock;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ToeicEstimateTests {

  @Test
  void scoreStaysWithinTheTestRange() {
    assertThat(ToeicEstimate.scaled(0, 100)).isEqualTo(ToeicEstimate.MIN_SCORE);
    assertThat(ToeicEstimate.scaled(100, 100)).isEqualTo(ToeicEstimate.MAX_SCORE);
    assertThat(ToeicEstimate.scaled(0, 0)).isEqualTo(ToeicEstimate.MIN_SCORE);
  }

  @Test
  void scoreNeverGoesDownWhenMoreAnswersAreCorrect() {
    int previous = ToeicEstimate.scaled(0, 94);
    for (int correct = 1; correct <= 94; correct++) {
      int score = ToeicEstimate.scaled(correct, 94);
      assertThat(score).as("correct=%d", correct).isGreaterThanOrEqualTo(previous);
      previous = score;
    }
  }

  @Test
  void anchorPointsAreUsedAsIs() {
    assertThat(ToeicEstimate.scaled(60, 100)).isEqualTo(300);
    assertThat(ToeicEstimate.scaled(90, 100)).isEqualTo(475);
  }

  @Test
  void targetTotalIsTheSumOfSectionTargets() {
    assertThat(ToeicEstimate.TARGET_LISTENING + ToeicEstimate.TARGET_READING).isEqualTo(ToeicEstimate.TARGET_TOTAL);
  }
}
