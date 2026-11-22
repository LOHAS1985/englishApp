package com.example.backend.wordbook;

import com.example.backend.common.AppState;
import com.example.backend.common.AppStateRepository;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.stats.StudyLogService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 同梱語の解放。同梱語は全部入れてあるが、解放するまで出題も一覧にも出さない。
 * 解放の条件: 解放済みの語の一周目(色を決めていない語で、まだ一度も出していない語)が終わった日の、次の日から。
 * 1日に解放するのは {@link #UNLOCK_PER_DAY} 語まで。解放は、単語帳を開いたときに行う(サーバーを動かし続けなくてよい)。
 */
@Service
public class WordbookUnlockService {

  /** 1日に解放する語の数 */
  static final int UNLOCK_PER_DAY = 20;

  static final String DONE_KEY = "wordbook.unlock.first_pass_done_on";
  static final String RELEASED_KEY = "wordbook.unlock.released_on";

  /** 状態の遷移の結果。doneOn は「一周目が終わったと確かめた日」、releasedOn は「最後に解放した日」、release は今日解放するか */
  record Step(LocalDate doneOn, LocalDate releasedOn, boolean release) {
  }

  /**
   * 今日の解放の判断(純粋関数)。
   * <ul>
   * <li>今日すでに解放していれば、何もしない</li>
   * <li>一周目が終わっていなければ、「終わった日」を消す(次に終わったら、また数え直す)</li>
   * <li>一周目が終わったのを初めて確かめた日は、まだ解放しない(前日までの一周目が終わっていることが条件のため)</li>
   * <li>終わった日より後の日で、解放していない語が残っていれば解放する</li>
   * </ul>
   */
  static Step next(LocalDate today, LocalDate doneOn, LocalDate releasedOn, boolean firstPassComplete,
      boolean lockedRemain) {
    if (today.equals(releasedOn)) {
      return new Step(doneOn, releasedOn, false);
    }
    if (!firstPassComplete) {
      return new Step(null, releasedOn, false);
    }
    if (doneOn == null) {
      return new Step(today, releasedOn, false);
    }
    if (!doneOn.isBefore(today)) {
      return new Step(doneOn, releasedOn, false);
    }
    if (lockedRemain) {
      return new Step(null, today, true);
    }
    return new Step(doneOn, releasedOn, false);
  }

  private final WordbookWordRepository repository;
  private final AppStateRepository states;
  private final CurrentUserProvider currentUserProvider;

  public WordbookUnlockService(WordbookWordRepository repository, AppStateRepository states,
      CurrentUserProvider currentUserProvider) {
    this.repository = repository;
    this.states = states;
    this.currentUserProvider = currentUserProvider;
  }

  /** 今日の分を、必要なら解放する。単語帳を開くたびに呼ばれる(今日の分は1回だけ) */
  @Transactional
  public void releaseIfDue() {
    releaseIfDue(LocalDate.now(StudyLogService.JST));
  }

  @Transactional
  void releaseIfDue(LocalDate today) {
    List<WordbookWord> words = repository.findByUserIdOrderByIdAsc(currentUserProvider.getCurrentUserId());
    boolean firstPassComplete = words.stream()
        .noneMatch(w -> w.isUnlocked() && w.getColor() == WordbookColor.NONE && w.isUnseen());
    boolean lockedRemain = words.stream().anyMatch(w -> !w.isUnlocked());

    LocalDate doneOn = dateOf(DONE_KEY);
    LocalDate releasedOn = dateOf(RELEASED_KEY);
    Step step = next(today, doneOn, releasedOn, firstPassComplete, lockedRemain);

    if (step.release()) {
      // 入っている順(登録順。同梱語は w0601 から順)に、解放していない語を解放する
      words.stream()
          .filter(w -> !w.isUnlocked())
          .limit(UNLOCK_PER_DAY)
          .forEach(w -> {
            w.setUnlocked(true);
            repository.save(w);
          });
    }
    save(DONE_KEY, step.doneOn());
    save(RELEASED_KEY, step.releasedOn());
  }

  private LocalDate dateOf(String key) {
    return states.findById(key).map(AppState::getValue).map(LocalDate::parse).orElse(null);
  }

  /** 日付を保存する。null のときは、その状態を消す */
  private void save(String key, LocalDate value) {
    if (value == null) {
      states.findById(key).ifPresent(states::delete);
    } else {
      states.save(new AppState(key, value.toString()));
    }
  }
}
