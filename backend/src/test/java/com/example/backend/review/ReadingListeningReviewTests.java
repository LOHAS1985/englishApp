package com.example.backend.review;

import com.example.backend.common.QuestionSetPractice;
import com.example.backend.common.QuestionSetPractice.SetAnswerRequest;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.reading.ReadingQuestionBank;
import com.example.backend.stats.StudyLogService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 読解・リスニングの間違えた設問を復習に入れ、復習日になったセットを出せること */
@SpringBootTest
class ReadingListeningReviewTests {

  @Autowired
  private QuestionSetPractice practice;
  @Autowired
  private ReadingQuestionBank readingBank;
  @Autowired
  private ReviewService reviewService;
  @Autowired
  private ReviewItemRepository reviews;
  @Autowired
  private CurrentUserProvider currentUserProvider;

  @Test
  void aWrongReadingAnswerIsAddedToReviewAndItsSetIsFoundWhenDue() {
    var set = readingBank.all().stream().filter(s -> s.questions().size() >= 2).findFirst().orElseThrow();

    // 1問目は間違え、2問目は正解、残りは答えていない(間違いとして数える)
    List<String> answers = new ArrayList<>();
    answers.add(set.questions().get(0).answer().equals("A") ? "B" : "A");
    answers.add(set.questions().get(1).answer());
    practice.grade(readingBank, "reading", new SetAnswerRequest(set.id(), answers, 30, null, null, null));

    // (共有のデータベースでは、同じ設問を前のテストが登録済みのこともあるので、件数ではなく有無で確かめる)
    long userId = currentUserProvider.getCurrentUserId();
    assertThat(reviews.findByUserIdAndFeatureAndItemId(userId, "reading", set.id() + "-1")).isPresent();
    assertThat(reviews.findByUserIdAndFeatureAndItemId(userId, "reading", set.id() + "-" + set.questions().size()))
        .isPresent();

    // 復習日になった状態にする(明日の復習を、今日に変える)
    ReviewItem item = reviews.findByUserIdAndFeatureAndItemId(currentUserProvider.getCurrentUserId(), "reading",
        set.id() + "-1").orElseThrow();
    item.schedule(0, LocalDate.now(StudyLogService.JST), LocalDateTime.now(StudyLogService.JST));
    reviews.save(item);

    assertThat(practice.dueSetId(readingBank, "reading", null)).isNotNull();
    // 表示中のセットは除く(同じセットが続けて出ないように)。ほかに復習が無ければ「すべて終わりました」
    try {
      assertThat(practice.dueSetId(readingBank, "reading", set.id())).isNotEqualTo(set.id());
    } catch (IllegalArgumentException noOtherReview) {
      assertThat(noOtherReview.getMessage()).contains("すべて終わりました");
    }
  }

  @Test
  void setIdIsTakenFromTheReviewItemId() {
    assertThat(QuestionSetPractice.setIdOf("r0001-3")).isEqualTo("r0001");
    assertThat(QuestionSetPractice.setIdOf("l1149-12")).isEqualTo("l1149");
    assertThat(QuestionSetPractice.setIdOf("plain")).isEqualTo("plain");
  }

  @Test
  void noDueSetMeansTodaysReviewIsDone() {
    // 該当する復習がない機能は、すぐに「すべて終わりました」を返す
    assertThatThrownBy(() -> practice.dueSetId(readingBank, "listening", null))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
