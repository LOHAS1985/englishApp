package com.example.backend.review;

import com.example.backend.review.ReviewService.Schedule;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class ReviewServiceTests {

  private static final LocalDate TODAY = LocalDate.of(2026, 11, 1);

  @Test
  void wrongAnswerIsScheduledForTomorrow() {
    assertThat(ReviewService.next(null, null, false, TODAY)).isEqualTo(new Schedule(0, TODAY.plusDays(1)));
    // 途中の段階で間違えても最初からやり直す
    assertThat(ReviewService.next(2, TODAY, false, TODAY)).isEqualTo(new Schedule(0, TODAY.plusDays(1)));
  }

  @Test
  void correctAnswerOnDueDateExtendsInterval() {
    assertThat(ReviewService.next(0, TODAY, true, TODAY)).isEqualTo(new Schedule(1, TODAY.plusDays(3)));
    assertThat(ReviewService.next(1, TODAY.minusDays(2), true, TODAY)).isEqualTo(new Schedule(2, TODAY.plusDays(7)));
    assertThat(ReviewService.next(2, TODAY, true, TODAY)).isEqualTo(new Schedule(3, TODAY.plusDays(14)));
  }

  @Test
  void correctAnswerAtLastStageRemovesItem() {
    assertThat(ReviewService.next(3, TODAY, true, TODAY)).isNull();
  }

  @Test
  void correctAnswerBeforeDueDateKeepsSchedule() {
    assertThat(ReviewService.next(1, TODAY.plusDays(2), true, TODAY)).isEqualTo(new Schedule(1, TODAY.plusDays(2)));
  }

  @Test
  void correctAnswerForUnregisteredItemIsIgnored() {
    assertThat(ReviewService.next(null, null, true, TODAY)).isNull();
  }
}
