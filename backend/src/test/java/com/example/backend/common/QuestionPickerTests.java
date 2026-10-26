package com.example.backend.common;

import com.example.backend.common.QuestionPicker.Attempt;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class QuestionPickerTests {

  private static final List<String> IDS = IntStream.rangeClosed(1, 20).mapToObj(i -> "q" + i).toList();

  @Test
  void noRepeatUntilAllQuestionsAreAnswered() {
    Random random = new Random(1);
    List<Attempt> history = new ArrayList<>();
    Set<String> seen = new HashSet<>();
    for (int i = 0; i < IDS.size(); i++) {
      String id = QuestionPicker.pick(IDS, history, null, random);
      assertThat(seen.add(id)).as("1周目で重複: " + id).isTrue();
      history.add(0, new Attempt(id, true));
    }
    assertThat(seen).containsExactlyInAnyOrderElementsOf(IDS);
  }

  @Test
  void neverPicksExcludedQuestion() {
    Random random = new Random(2);
    for (int i = 0; i < 200; i++) {
      assertThat(QuestionPicker.pick(List.of("a", "b"), List.of(), "a", random)).isEqualTo("b");
    }
  }

  @Test
  void wrongAnswersComeBackAsReview() {
    // q1 を間違え、そのあと別の問題を数問解いた状態
    List<Attempt> history = new ArrayList<>();
    for (int i = 2; i <= 8; i++) {
      history.add(0, new Attempt("q" + i, true));
    }
    history.add(new Attempt("q1", false));
    Random random = new Random(3);
    int review = 0;
    for (int i = 0; i < 1000; i++) {
      if (QuestionPicker.pick(IDS, history, null, random).equals("q1")) {
        review++;
      }
    }
    // 復習として約3割、残りは未出題の12問から選ばれる
    assertThat(review).isBetween(250, 350);
  }

  @Test
  void recentlyAnsweredWrongQuestionIsNotRepeatedImmediately() {
    List<Attempt> history = List.of(new Attempt("q1", false));
    Random random = new Random(4);
    for (int i = 0; i < 200; i++) {
      assertThat(QuestionPicker.pick(IDS, history, null, random)).isNotEqualTo("q1");
    }
  }

  @Test
  void setAttemptIsWrongIfAnyQuestionIsWrong() {
    // 新しい順:r2 の設問3,2,1(設問2が不正解)、r1 の設問2,1(全問正解)
    List<PracticeRecord> rows = List.of(
        new PracticeRecord(1L, "reading", "r2", 3, "A", true),
        new PracticeRecord(1L, "reading", "r2", 2, "B", false),
        new PracticeRecord(1L, "reading", "r2", 1, "C", true),
        new PracticeRecord(1L, "reading", "r1", 2, "A", true),
        new PracticeRecord(1L, "reading", "r1", 1, "D", true));
    assertThat(QuestionSelector.practiceAttempts(rows))
        .containsExactly(new Attempt("r2", false), new Attempt("r1", true));
  }
}
