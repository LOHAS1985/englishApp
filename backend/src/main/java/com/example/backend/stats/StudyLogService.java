package com.example.backend.stats;

import com.example.backend.config.CurrentUserProvider;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;

/** 各機能の採点時に学習ログを1行保存する */
@Service
public class StudyLogService {

  public static final ZoneId JST = ZoneId.of("Asia/Tokyo");

  /** 画面を開いたまま放置した分を学習時間に数えないよう、1回あたりの上限を設ける */
  static final int MAX_DURATION_SECONDS = 30 * 60;

  private final StudyLogRepository repository;
  private final CurrentUserProvider currentUserProvider;

  public StudyLogService(StudyLogRepository repository, CurrentUserProvider currentUserProvider) {
    this.repository = repository;
    this.currentUserProvider = currentUserProvider;
  }

  /**
   * @param correct 正解数(ライティングは得点)。正誤が無いものは null
   * @param total   設問数(ライティングは満点)。正誤が無いものは null
   */
  public void log(String feature, String itemType, String itemId, Integer correct, Integer total,
      Integer durationSeconds) {
    repository.save(new StudyLog(currentUserProvider.getCurrentUserId(), feature, itemType, itemId, correct, total,
        clampDuration(durationSeconds), LocalDateTime.now(JST)));
  }

  static int clampDuration(Integer seconds) {
    if (seconds == null || seconds < 0) {
      return 0;
    }
    return Math.min(seconds, MAX_DURATION_SECONDS);
  }
}
