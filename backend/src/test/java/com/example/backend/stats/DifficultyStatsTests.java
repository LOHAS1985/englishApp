package com.example.backend.stats;

import com.example.backend.common.PracticeRecord;
import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.stats.dto.DifficultyItem;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** 難易度4の成績: 問題集の難易度4の数と、解いた設問の正誤(難易度4以外は数えない) */
@SpringBootTest
class DifficultyStatsTests {

  @Autowired
  private DifficultyStatsService service;
  @Autowired
  private ListeningQuestionBank listeningBank;
  @Autowired
  private PracticeRecordRepository records;
  @Autowired
  private CurrentUserProvider currentUserProvider;

  private DifficultyItem listening() {
    return service.summary().stream().filter(i -> i.feature().equals("listening")).findFirst().orElseThrow();
  }

  @Test
  void countsLevelFourAnswersOnly() {
    String level4 = listeningBank.all().stream().filter(s -> listeningBank.difficulty(s.id()) == 4).findFirst()
        .orElseThrow().id();
    DifficultyItem before = listening();
    assertThat(before.available()).isPositive();

    Long userId = currentUserProvider.getCurrentUserId();
    records.save(new PracticeRecord(userId, "listening", level4, 1, "A", true));
    records.save(new PracticeRecord(userId, "listening", level4, 2, "B", false));
    DifficultyItem after = listening();

    assertThat(after.answered()).isEqualTo(before.answered() + 2);
    assertThat(after.correct()).isEqualTo(before.correct() + 1);
    assertThat(after.available()).isEqualTo(before.available());
  }

  @Test
  void aLevelOneToThreeAnswerIsNotCounted() {
    String other = listeningBank.all().stream().filter(s -> listeningBank.difficulty(s.id()) != 4).findFirst()
        .orElseThrow().id();
    DifficultyItem before = listening();

    records.save(new PracticeRecord(currentUserProvider.getCurrentUserId(), "listening", other, 1, "A", true));

    assertThat(listening().answered()).isEqualTo(before.answered());
  }

  @Test
  void grammarHasNoLevelFourQuestionsYet() {
    Optional<DifficultyItem> grammar = service.summary().stream().filter(i -> i.feature().equals("grammar")).findFirst();
    assertThat(grammar).isPresent();
    assertThat(grammar.get().available()).isZero();
  }
}
