package com.example.backend.wordbook;

import com.example.backend.common.AppState;
import com.example.backend.common.AppStateRepository;
import com.example.backend.common.PracticeRecord;
import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.config.CurrentUserProvider;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 出題回数・復習日の列を足した直後に、これまでの解答記録(practice_records の wordbook)から語ごとの状態を復元する。
 * 最後の解答が正解なら段階 1(3日後)、間違いなら段階 0(翌日)から始める。1回だけ行う(状態は app_state に残す)。
 */
@Component
public class WordbookScheduleBackfill {

  static final String STATE_KEY = "wordbook.schedule.backfill";
  private static final String VERSION = "1";
  private static final String FEATURE = "wordbook";

  private final WordbookWordRepository words;
  private final PracticeRecordRepository records;
  private final AppStateRepository states;
  private final CurrentUserProvider currentUserProvider;

  public WordbookScheduleBackfill(WordbookWordRepository words, PracticeRecordRepository records,
      AppStateRepository states, CurrentUserProvider currentUserProvider) {
    this.words = words;
    this.records = records;
    this.states = states;
    this.currentUserProvider = currentUserProvider;
  }

  @Transactional
  public void runIfNeeded() {
    if (states.findById(STATE_KEY).map(AppState::getValue).filter(VERSION::equals).isPresent()) {
      return;
    }
    Long userId = currentUserProvider.getCurrentUserId();
    // 新しい順。語ごとに最初に出てくる記録が、最後の解答
    Map<String, List<PracticeRecord>> byWord = new HashMap<>();
    for (PracticeRecord r : records.findByUserIdAndFeatureOrderByIdDesc(userId, FEATURE)) {
      byWord.computeIfAbsent(r.getItemId(), k -> new ArrayList<>()).add(r);
    }
    for (WordbookWord word : words.findByUserIdOrderByIdAsc(userId)) {
      List<PracticeRecord> history = byWord.get(String.valueOf(word.getId()));
      // すでに新しい版で出題された語(回数がある語)は触らない
      if (history == null || history.isEmpty() || word.getTimesAsked() > 0) {
        continue;
      }
      PracticeRecord last = history.get(0);
      int correct = (int) history.stream().filter(r -> Boolean.TRUE.equals(r.getCorrect())).count();
      word.restoreSchedule(history.size(), correct, last.getCreatedAt(), Boolean.TRUE.equals(last.getCorrect()));
      words.save(word);
    }
    states.save(new AppState(STATE_KEY, VERSION));
  }
}
