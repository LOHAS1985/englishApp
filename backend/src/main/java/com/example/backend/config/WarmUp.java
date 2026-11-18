package com.example.backend.config;

import com.example.backend.common.QuestionSelector;
import com.example.backend.level.LevelService;
import com.example.backend.review.ReviewService;
import com.example.backend.stats.StatsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * 起動後に、ホーム画面が最初に呼ぶ API(レベル・統計・復習件数・解答履歴)を1回ずつ呼んで、部品を温める。
 * 本番は起動を速くするため遅延初期化(spring.main.lazy-initialization=true)で、部品は最初に使われたときに作る。
 * そのままだと、再起動(デプロイ・眠りからの復帰)の後の最初の画面表示が、CPU 0.1 の Render で数秒遅くなる
 * (本番と同じ設定のローカル実測: 最初の /api/level が 422ms、2回目以降は約 15〜20ms)。
 * 画面を開かれる前に済ませておく。別のスレッドで行うので、起動の完了は待たせない。失敗しても無視する。
 * データベースにも接続する(外部 DB が止まっていれば、起こすことになる)。不要なら app.warmup=false(APP_WARMUP)。
 */
// 起動時に作る(イベントを受けるため)。重い部品は ObjectProvider で後から取り出すので、起動を遅らせない
@Lazy(false)
@Component
public class WarmUp {

  private static final Logger logger = LoggerFactory.getLogger(WarmUp.class);

  private final ObjectProvider<LevelService> levelService;
  private final ObjectProvider<StatsService> statsService;
  private final ObjectProvider<ReviewService> reviewService;
  private final ObjectProvider<QuestionSelector> questionSelector;
  private final boolean enabled;

  public WarmUp(ObjectProvider<LevelService> levelService, ObjectProvider<StatsService> statsService,
      ObjectProvider<ReviewService> reviewService, ObjectProvider<QuestionSelector> questionSelector,
      @Value("${app.warmup:false}") boolean enabled) {
    this.levelService = levelService;
    this.statsService = statsService;
    this.reviewService = reviewService;
    this.questionSelector = questionSelector;
    this.enabled = enabled;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void start() {
    if (!enabled) {
      return;
    }
    Thread thread = new Thread(this::run, "warm-up");
    thread.setDaemon(true);
    thread.start();
  }

  void run() {
    long started = System.currentTimeMillis();
    step("level", () -> levelService.getObject().summary());
    step("stats", () -> statsService.getObject().summary());
    step("review", () -> reviewService.getObject().summary());
    step("practice-history", () -> questionSelector.getObject().answerRows("grammar"));
    logger.info("warm-up finished in {}ms", System.currentTimeMillis() - started);
  }

  private void step(String name, Runnable action) {
    long started = System.currentTimeMillis();
    try {
      action.run();
      logger.info("warm-up {}: {}ms", name, System.currentTimeMillis() - started);
    } catch (Exception e) {
      // 温めるだけなので、失敗しても起動や画面の表示には影響させない
      logger.warn("warm-up {} failed: {}", name, e.getMessage());
    }
  }
}
