package com.example.backend.wordbook;

import com.example.backend.common.AppState;
import com.example.backend.common.AppStateRepository;
import com.example.backend.stats.StudyLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 単語帳の定期処理。日本語訳の調査は1日に1回、日本時間 7:00 以降に行う。
 * Render の無料枠は眠るため、起動時にも「今日まだ行っていなければ」行う(起動 ping は 6:00 から動く)。
 */
// 本番は遅延初期化で起動するが、@Scheduled と起動時の処理を登録するため起動時に作る(AccessLogService と同じ)
@Lazy(false)
@Component
public class WordbookJobs {

  private static final Logger logger = LoggerFactory.getLogger(WordbookJobs.class);

  static final String TRANSLATION_STATE_KEY = "wordbook.translation.last_run";
  static final int RUN_HOUR = 7;

  private final BundledWordSeeder seeder;
  private final WordbookTranslationService translationService;
  private final AppStateRepository states;

  public WordbookJobs(BundledWordSeeder seeder, WordbookTranslationService translationService,
      AppStateRepository states) {
    this.seeder = seeder;
    this.translationService = translationService;
    this.states = states;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void onStartup() {
    seeder.seedIfNeeded();
    runTranslationIfDue(LocalDateTime.now(StudyLogService.JST));
  }

  @Scheduled(cron = "0 0 7 * * *", zone = "Asia/Tokyo")
  public void runDaily() {
    runTranslationIfDue(LocalDateTime.now(StudyLogService.JST));
  }

  /** 失敗した語も含めて、その日の調査は1回で終える。残りは翌日の調査で取り直す */
  synchronized void runTranslationIfDue(LocalDateTime now) {
    if (now.getHour() < RUN_HOUR) {
      return;
    }
    String today = now.toLocalDate().toString();
    if (states.findById(TRANSLATION_STATE_KEY).map(AppState::getValue).filter(today::equals).isPresent()) {
      return;
    }
    try {
      int completed = translationService.translatePending();
      logger.info("単語帳の日本語訳を調査しました: 完了 {} 語", completed);
    } catch (RuntimeException e) {
      logger.warn("単語帳の日本語訳の調査に失敗しました: {}", e.getMessage());
    }
    states.save(new AppState(TRANSLATION_STATE_KEY, today));
  }
}
