package com.example.backend.wordbook;

import com.example.backend.common.AppStateRepository;
import com.example.backend.common.PracticeRecord;
import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.stats.StudyLogService;
import com.example.backend.wordbook.dto.ChoiceAnswerRequest;
import com.example.backend.wordbook.dto.ChoiceQuestionView;
import com.example.backend.wordbook.dto.StatsView;
import com.example.backend.wordbook.dto.SummaryView;
import com.example.backend.wordbook.dto.WordView;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** 4択に答えると、語の出題回数・復習日・色が更新され、今日のメニューの数(復習・新規)に反映される */
@SpringBootTest
class WordbookScheduleIntegrationTests {

  @Autowired
  private WordbookQuizService quiz;
  @Autowired
  private WordbookService wordService;
  @Autowired
  private WordbookScheduleBackfill backfill;
  @Autowired
  private WordbookWordRepository words;
  @Autowired
  private PracticeRecordRepository records;
  @Autowired
  private AppStateRepository states;
  @Autowired
  private CurrentUserProvider currentUserProvider;

  private WordView find(Long id) {
    return wordService.list(null, null).stream().filter(w -> w.id().equals(id)).findFirst().orElseThrow();
  }

  @Test
  void wrongAnswerUpdatesTheScheduleTurnsTheWordRedAndMovesItOutOfNew() {
    SummaryView before = wordService.summary();
    ChoiceQuestionView question = quiz.choiceQuestion(Set.of());
    WordView target = find(question.wordId());
    assertThat(target.timesAsked()).isZero();
    assertThat(target.nextDueDate()).isNull();

    var result = quiz.answerChoice(new ChoiceAnswerRequest(question.wordId(), "どれでもない訳", 5));

    assertThat(result.correct()).isFalse();
    assertThat(result.color()).isEqualTo("RED");
    WordView after = find(question.wordId());
    assertThat(after.timesAsked()).isEqualTo(1);
    assertThat(after.timesCorrect()).isZero();
    assertThat(after.color()).isEqualTo("RED");
    assertThat(after.nextDueDate()).isEqualTo(LocalDate.now(StudyLogService.JST).plusDays(1));

    SummaryView summary = wordService.summary();
    assertThat(summary.unseen()).isEqualTo(before.unseen() - 1);
    assertThat(summary.red()).isGreaterThanOrEqualTo(1);
    // 復習日は明日なので、今日の復習にはまだ入らない
    assertThat(summary.due()).isEqualTo(before.due());
  }

  @Test
  void correctAnswerSchedulesThreeDaysLaterWithoutChangingTheColor() {
    ChoiceQuestionView question = quiz.choiceQuestion(Set.of());
    WordbookWord word = words.findById(question.wordId()).orElseThrow();
    WordbookColor colorBefore = word.getColor();

    var result = quiz.answerChoice(new ChoiceAnswerRequest(question.wordId(), word.getMeaningJa(), 5));

    assertThat(result.correct()).isTrue();
    WordView after = find(question.wordId());
    assertThat(after.timesCorrect()).isEqualTo(1);
    assertThat(after.color()).isEqualTo(colorBefore.name());
    assertThat(after.nextDueDate()).isEqualTo(LocalDate.now(StudyLogService.JST).plusDays(3));
  }

  @Test
  void backfillRestoresTheStateFromTheAnswerHistoryOnce() {
    Long userId = currentUserProvider.getCurrentUserId();
    WordbookWord target = words.findByUserIdOrderByIdAsc(userId).stream()
        .filter(w -> w.getTimesAsked() == 0).findFirst().orElseThrow();
    String itemId = String.valueOf(target.getId());
    // 以前の版で、2回間違えて、最後は正解した語
    LocalDateTime lastAt = LocalDateTime.now(StudyLogService.JST).minusDays(2);
    records.save(new PracticeRecord(userId, "wordbook", itemId, 1, null, false));
    records.save(new PracticeRecord(userId, "wordbook", itemId, 1, null, false));
    records.save(new PracticeRecord(userId, "wordbook", itemId, 1, null, true));

    states.deleteById(WordbookScheduleBackfill.STATE_KEY);
    backfill.runIfNeeded();

    WordbookWord restored = words.findById(target.getId()).orElseThrow();
    assertThat(restored.getTimesAsked()).isEqualTo(3);
    assertThat(restored.getTimesCorrect()).isEqualTo(1);
    assertThat(restored.getReviewStage()).isEqualTo(1);
    assertThat(restored.getNextDueDate()).isAfterOrEqualTo(lastAt.toLocalDate());
    assertThat(restored.isUnseen()).isFalse();

    // 2回目は何もしない(その後に増えた回数を上書きしない)
    restored.recordAnswer(false, LocalDateTime.now(StudyLogService.JST));
    words.save(restored);
    backfill.runIfNeeded();
    assertThat(words.findById(target.getId()).orElseThrow().getTimesAsked()).isEqualTo(4);
  }

  @Test
  void statsShowTheDistributionRecentAccuracyAndWeakWords() {
    StatsView before = quiz.stats();
    ChoiceQuestionView question = quiz.choiceQuestion(Set.of());

    quiz.answerChoice(new ChoiceAnswerRequest(question.wordId(), "どれでもない訳", 5));
    quiz.answerChoice(new ChoiceAnswerRequest(question.wordId(), "どれでもない訳", 5));
    StatsView after = quiz.stats();

    // 新規から学習中に移る。習熟度の合計は出題できる語の数と一致する
    assertThat(after.unseen()).isEqualTo(before.unseen() - 1);
    assertThat(after.learning()).isEqualTo(before.learning() + 1);
    assertThat(after.total()).isEqualTo(after.unseen() + after.learning() + after.mastered());
    assertThat(after.recentAsked()).isEqualTo(before.recentAsked() + 2);
    assertThat(after.recentCorrect()).isEqualTo(before.recentCorrect());
    // 2回出して2回とも間違えた語は、苦手な語に入る(正答率が低い順)
    assertThat(after.weakest()).hasSizeLessThanOrEqualTo(10);
    assertThat(after.weakest()).anySatisfy(w -> {
      assertThat(w.id()).isEqualTo(question.wordId());
      assertThat(w.timesAsked()).isEqualTo(2);
      assertThat(w.timesCorrect()).isZero();
    });
  }
}
