package com.example.backend.config;

import com.example.backend.common.QuestionSelector;
import com.example.backend.level.LevelService;
import com.example.backend.review.ReviewService;
import com.example.backend.stats.StatsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class WarmUpTests {

  private LevelService level;
  private StatsService stats;
  private ReviewService review;
  private QuestionSelector selector;
  private ObjectProvider<LevelService> levelProvider;
  private ObjectProvider<StatsService> statsProvider;
  private ObjectProvider<ReviewService> reviewProvider;
  private ObjectProvider<QuestionSelector> selectorProvider;

  @SuppressWarnings("unchecked")
  @BeforeEach
  void setUp() {
    level = mock(LevelService.class);
    stats = mock(StatsService.class);
    review = mock(ReviewService.class);
    selector = mock(QuestionSelector.class);
    levelProvider = mock(ObjectProvider.class);
    statsProvider = mock(ObjectProvider.class);
    reviewProvider = mock(ObjectProvider.class);
    selectorProvider = mock(ObjectProvider.class);
    when(levelProvider.getObject()).thenReturn(level);
    when(statsProvider.getObject()).thenReturn(stats);
    when(reviewProvider.getObject()).thenReturn(review);
    when(selectorProvider.getObject()).thenReturn(selector);
  }

  private WarmUp warmUp(boolean enabled) {
    return new WarmUp(levelProvider, statsProvider, reviewProvider, selectorProvider, enabled);
  }

  @Test
  void callsTheApisTheHomeScreenCallsFirst() {
    warmUp(true).run();

    verify(level).summary();
    verify(stats).summary();
    verify(review).summary();
    verify(selector).answerRows("grammar");
  }

  /** 温めるだけなので、1つ失敗しても残りは続ける(起動や画面の表示には影響させない) */
  @Test
  void keepsGoingWhenOneStepFails() {
    when(level.summary()).thenThrow(new IllegalStateException("db is down"));

    warmUp(true).run();

    verify(stats).summary();
    verify(review).summary();
    verify(selector).answerRows(anyString());
  }

  @Test
  void startsInTheBackgroundWhenEnabled() {
    warmUp(true).start();

    // 別のスレッドで動くので、少し待って確かめる
    verify(level, timeout(3000)).summary();
    verify(selector, timeout(3000)).answerRows("grammar");
  }

  @Test
  void doesNothingWhenDisabled() {
    warmUp(false).start();

    verifyNoInteractions(levelProvider, statsProvider, reviewProvider, selectorProvider);
    verify(level, never()).summary();
  }
}
