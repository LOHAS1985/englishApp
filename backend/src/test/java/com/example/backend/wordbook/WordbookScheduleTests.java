package com.example.backend.wordbook;

import com.example.backend.wordbook.WordbookWord.Source;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** 語ごとの復習の状態(正誤・間隔反復・自動の赤)の規則 */
class WordbookScheduleTests {

  private static final LocalDateTime DAY0 = LocalDateTime.of(2026, 11, 22, 9, 0);

  private static WordbookWord newWord() {
    return new WordbookWord(1L, "abandon", Source.BUNDLED, DAY0);
  }

  private static LocalDate day(int offset) {
    return DAY0.toLocalDate().plusDays(offset);
  }

  @Test
  void aNewWordHasNeverBeenAsked() {
    WordbookWord w = newWord();
    assertThat(w.isUnseen()).isTrue();
    assertThat(w.isDue(day(0))).isFalse();
    assertThat(w.getTimesAsked()).isZero();
  }

  @Test
  void wrongAnswerSchedulesTomorrowAndTurnsTheWordRed() {
    WordbookWord w = newWord();
    w.setColor(WordbookColor.BLUE, DAY0); // 覚えたつもりで青にしていた語でも、間違えたら赤にする

    w.recordAnswer(false, DAY0);

    assertThat(w.getColor()).isEqualTo(WordbookColor.RED);
    assertThat(w.getReviewStage()).isZero();
    assertThat(w.getNextDueDate()).isEqualTo(day(1));
    assertThat(w.getTimesAsked()).isEqualTo(1);
    assertThat(w.getTimesCorrect()).isZero();
    assertThat(w.isUnseen()).isFalse();
    assertThat(w.isDue(day(0))).isFalse();
    assertThat(w.isDue(day(1))).isTrue();
  }

  @Test
  void firstCorrectAnswerStartsAtThreeDays() {
    WordbookWord w = newWord();
    w.recordAnswer(true, DAY0);
    assertThat(w.getReviewStage()).isEqualTo(1);
    assertThat(w.getNextDueDate()).isEqualTo(day(3));
    assertThat(w.getTimesCorrect()).isEqualTo(1);
  }

  @Test
  void correctAnswersOnTheDueDateExtendTheIntervalUpToThirtyDays() {
    WordbookWord w = newWord();
    w.recordAnswer(true, DAY0); // 段階1: 3日後
    w.recordAnswer(true, DAY0.plusDays(3)); // 段階2: 7日後
    assertThat(w.getNextDueDate()).isEqualTo(day(10));
    w.recordAnswer(true, DAY0.plusDays(10)); // 段階3: 14日後
    assertThat(w.getNextDueDate()).isEqualTo(day(24));
    w.recordAnswer(true, DAY0.plusDays(24)); // 段階4: 30日後
    assertThat(w.getNextDueDate()).isEqualTo(day(54));
    w.recordAnswer(true, DAY0.plusDays(54)); // 最後の段階のまま、30日後
    assertThat(w.getReviewStage()).isEqualTo(4);
    assertThat(w.getNextDueDate()).isEqualTo(day(84));
  }

  @Test
  void correctAnswerBeforeTheDueDateDoesNotAdvance() {
    WordbookWord w = newWord();
    w.recordAnswer(true, DAY0); // 3日後が復習日
    w.recordAnswer(true, DAY0.plusDays(1)); // 復習日より前に解いた正解
    assertThat(w.getReviewStage()).isEqualTo(1);
    assertThat(w.getNextDueDate()).isEqualTo(day(3));
    assertThat(w.getTimesAsked()).isEqualTo(2);
    assertThat(w.getTimesCorrect()).isEqualTo(2);
  }

  @Test
  void wrongAnswerResetsTheStage() {
    WordbookWord w = newWord();
    w.recordAnswer(true, DAY0);
    w.recordAnswer(true, DAY0.plusDays(3)); // 段階2
    w.recordAnswer(false, DAY0.plusDays(10));
    assertThat(w.getReviewStage()).isZero();
    assertThat(w.getNextDueDate()).isEqualTo(day(11));
  }

  @Test
  void correctAnswersDoNotChangeTheColor() {
    WordbookWord w = newWord();
    w.setColor(WordbookColor.YELLOW, DAY0);
    w.recordAnswer(true, DAY0);
    w.recordAnswer(true, DAY0.plusDays(3));
    w.recordAnswer(true, DAY0.plusDays(10));
    // 色は利用者が付けるもの。正解が続いても勝手に青にしない
    assertThat(w.getColor()).isEqualTo(WordbookColor.YELLOW);
  }

  @Test
  void restoreScheduleUsesTheLastAnswer() {
    WordbookWord correctLast = newWord();
    correctLast.restoreSchedule(5, 4, DAY0, true);
    assertThat(correctLast.getReviewStage()).isEqualTo(1);
    assertThat(correctLast.getNextDueDate()).isEqualTo(day(3));
    assertThat(correctLast.getTimesAsked()).isEqualTo(5);
    assertThat(correctLast.getTimesCorrect()).isEqualTo(4);

    WordbookWord wrongLast = newWord();
    wrongLast.restoreSchedule(2, 1, DAY0, false);
    assertThat(wrongLast.getReviewStage()).isZero();
    assertThat(wrongLast.getNextDueDate()).isEqualTo(day(1));
  }
}
