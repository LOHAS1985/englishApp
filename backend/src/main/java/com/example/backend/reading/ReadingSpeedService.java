package com.example.backend.reading;

import com.example.backend.common.QuestionSetBank;
import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.reading.dto.ReadingSpeedItem;
import com.example.backend.stats.StudyLogService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 長文の読解速度(語/分)の記録と一覧。計測は「本文だけを読み、読み終えた」までの秒数で行う(設問に答えるまでは含めない)。
 */
@Service
public class ReadingSpeedService {

  /** これより短い計測は押し忘れや誤操作とみなして記録しない */
  static final int MIN_SECONDS = 10;
  /** これより長い計測は画面を放置したとみなして記録しない */
  static final int MAX_SECONDS = 30 * 60;

  private final ReadingSpeedRepository repository;
  private final CurrentUserProvider currentUserProvider;

  public ReadingSpeedService(ReadingSpeedRepository repository, CurrentUserProvider currentUserProvider) {
    this.repository = repository;
    this.currentUserProvider = currentUserProvider;
  }

  /** 本文の語数(空白で区切った数)。Part 6 の空所 [1] なども1語として数える */
  public static int countWords(String text) {
    if (text == null || text.isBlank()) {
      return 0;
    }
    return text.trim().split("\s+").length;
  }

  /** 語/分(四捨五入)。秒数が 0 以下なら 0 */
  public static int wordsPerMinute(int words, int seconds) {
    return seconds > 0 ? (int) Math.round(words / (seconds / 60.0)) : 0;
  }

  static boolean isMeasurable(Integer seconds) {
    return seconds != null && seconds >= MIN_SECONDS && seconds <= MAX_SECONDS;
  }

  /**
   * 計測の結果を保存する。本文の無いセット・計測していない解答・範囲外の秒数は何もしない。
   *
   * @param readingSeconds 本文を読み終えるまでの秒数(計測していなければ null)
   */
  public void save(QuestionSetBank bank, String setId, Integer readingSeconds) {
    if (!isMeasurable(readingSeconds)) {
      return;
    }
    QuestionSet set = bank.findById(setId).orElse(null);
    if (set == null || set.passage() == null) {
      return;
    }
    int words = countWords(set.passage());
    repository.save(new ReadingSpeed(currentUserProvider.getCurrentUserId(), set.id(), set.type(), words,
        readingSeconds, LocalDateTime.now(StudyLogService.JST)));
  }

  /** 直近の計測(新しい順) */
  public List<ReadingSpeedItem> recent() {
    return repository.findTop50ByUserIdOrderByIdDesc(currentUserProvider.getCurrentUserId()).stream()
        .map(ReadingSpeedItem::from)
        .toList();
  }
}
