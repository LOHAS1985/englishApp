package com.example.backend.stats;

import com.example.backend.config.CurrentUserProvider;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/** 各機能の採点時に学習ログを1行保存する */
@Service
public class StudyLogService {

  public static final ZoneId JST = ZoneId.of("Asia/Tokyo");

  /** 画面を開いたまま放置した分を学習時間に数えないよう、1回あたりの上限を設ける */
  static final int MAX_DURATION_SECONDS = 30 * 60;

  static final int MAX_REQUEST_ID_LENGTH = 64;

  /** 解答時刻として受け付ける、過去・未来の範囲 */
  static final Duration MAX_ANSWER_AGE = Duration.ofDays(7);
  static final Duration MAX_CLOCK_SKEW = Duration.ofMinutes(5);

  /** 模試の1区切り(リーディング 75 分)を上限で切らないよう、通常より長く数える */
  static final int MAX_SESSION_SECONDS = 2 * 60 * 60;

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
    log(feature, itemType, itemId, correct, total, durationSeconds, null, LocalDateTime.now(JST));
  }

  /**
   * @param clientRequestId 画面が付けた解答ごとの ID。再送で二重に保存しないために使う(無ければ null)
   * @param answeredAt      解答した日本時間の時刻({@link #answeredAt} で決めた値)
   */
  public void log(String feature, String itemType, String itemId, Integer correct, Integer total,
      Integer durationSeconds, String clientRequestId, LocalDateTime answeredAt) {
    repository.save(new StudyLog(currentUserProvider.getCurrentUserId(), feature, itemType, itemId, correct, total,
        clampDuration(durationSeconds), answeredAt, normalizeRequestId(clientRequestId)));
  }

  /** この ID の解答を、すでに保存したか(画面の送信待ちの列が再送したときに、二重に保存しないための判定) */
  public boolean isRecorded(String clientRequestId) {
    String id = normalizeRequestId(clientRequestId);
    return id != null && repository.existsByUserIdAndClientRequestId(currentUserProvider.getCurrentUserId(), id);
  }

  /** 空・長すぎる ID は付けなかったものとして扱う(列の長さを超えて保存に失敗しないため) */
  static String normalizeRequestId(String clientRequestId) {
    if (clientRequestId == null) {
      return null;
    }
    String id = clientRequestId.trim();
    return id.isEmpty() || id.length() > MAX_REQUEST_ID_LENGTH ? null : id;
  }

  /** 画面から送られた解答時刻を日本時間で返す。範囲外・未指定なら今 */
  public static LocalDateTime answeredAt(Instant answeredAt) {
    return answeredAt(answeredAt, Instant.now());
  }

  /**
   * 解答した時刻。オフラインやサーバーの起動待ちで送信が遅れても、解いた日に数えるために画面の時刻を使う。
   * 端末の時計がずれていても記録が壊れないよう、7日前〜5分先の範囲だけ受け付け、外れたら今にする
   */
  static LocalDateTime answeredAt(Instant answeredAt, Instant now) {
    boolean plausible = answeredAt != null
        && !answeredAt.isBefore(now.minus(MAX_ANSWER_AGE))
        && !answeredAt.isAfter(now.plus(MAX_CLOCK_SKEW));
    return LocalDateTime.ofInstant(plausible ? answeredAt : now, JST);
  }

  /**
   * 模試のように1回の時間が長い区切り(TOEIC のリスニング 45 分・リーディング 75 分)を1行で記録する。
   * 通常の解答より長いので、上限は {@link #MAX_SESSION_SECONDS} を使う。
   */
  public void logSession(String feature, String itemType, String itemId, int correct, int total,
      int durationSeconds) {
    repository.save(new StudyLog(currentUserProvider.getCurrentUserId(), feature, itemType, itemId, correct, total,
        clampSeconds(durationSeconds, MAX_SESSION_SECONDS), LocalDateTime.now(JST)));
  }

  static int clampDuration(Integer seconds) {
    return clampSeconds(seconds, MAX_DURATION_SECONDS);
  }

  /** 画面から送られた秒数を 0〜max に収める(時計のずれ・画面の開きっぱなしで極端な値が来るため。無ければ 0) */
  public static int clampSeconds(Integer seconds, int max) {
    return seconds == null ? 0 : Math.min(Math.max(seconds, 0), max);
  }
}
