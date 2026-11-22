package com.example.backend.wordbook;

import com.example.backend.wordbook.WordbookUnlockService.Step;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** 同梱語の解放: 「前日までの一周目が終わったら、次の日から解放する」の判断と、解放前の語が出ないこと */
@SpringBootTest
class WordbookUnlockTests {

  private static final LocalDate DAY1 = LocalDate.of(2026, 11, 22);
  private static final LocalDate DAY2 = DAY1.plusDays(1);
  private static final LocalDate DAY3 = DAY1.plusDays(2);

  @Autowired
  private WordbookService wordService;
  @Autowired
  private WordbookWordRepository repository;

  @Test
  void aFirstPassThatJustFinishedReleasesNothingUntilTheNextDay() {
    Step step = WordbookUnlockService.next(DAY1, null, null, true, true);

    assertThat(step.release()).isFalse();
    assertThat(step.doneOn()).isEqualTo(DAY1);
  }

  @Test
  void theNextDayReleasesWhenLockedWordsRemain() {
    Step step = WordbookUnlockService.next(DAY2, DAY1, null, true, true);

    assertThat(step.release()).isTrue();
    assertThat(step.releasedOn()).isEqualTo(DAY2);
    assertThat(step.doneOn()).isNull();
  }

  @Test
  void onlyOneReleasePerDay() {
    // 解放した日は、もう解放しない(一周目が終わっていても)
    Step step = WordbookUnlockService.next(DAY2, DAY1, DAY2, true, true);

    assertThat(step.release()).isFalse();
  }

  @Test
  void aPassThatIsNotFinishedKeepsWaiting() {
    // 一周目がまだ残っていれば、解放しない。終わった日の記録も消す(終わったら数え直す)
    Step step = WordbookUnlockService.next(DAY2, DAY1, null, false, true);

    assertThat(step.release()).isFalse();
    assertThat(step.doneOn()).isNull();
  }

  @Test
  void nothingIsReleasedWhenEveryWordIsAlreadyOpen() {
    Step step = WordbookUnlockService.next(DAY2, DAY1, null, true, false);

    assertThat(step.release()).isFalse();
  }

  @Test
  void theCycleRepeatsOnTheFollowingDays() {
    Step day1 = WordbookUnlockService.next(DAY1, null, null, true, true);
    Step day2 = WordbookUnlockService.next(DAY2, day1.doneOn(), day1.releasedOn(), true, true);
    assertThat(day2.release()).isTrue();

    // 20語を解放すると、次の一周目が終わるまで待つ
    Step day2Pass = WordbookUnlockService.next(DAY2, day2.doneOn(), day2.releasedOn(), false, true);
    Step day3 = WordbookUnlockService.next(DAY3, day2Pass.doneOn(), day2Pass.releasedOn(), true, true);
    assertThat(day3.release()).isFalse();
    assertThat(day3.doneOn()).isEqualTo(DAY3);
  }

  @Test
  void bundledWordsAfterTheOpenRangeAreHiddenFromTheList() {
    // 起動時の投入で、w0601 以降の同梱語は解放前になる。一覧にも出ない
    List<WordbookWord> locked = repository.findAll().stream()
        .filter(w -> w.getBundledId() != null && w.getBundledId().compareTo("w0600") > 0 && !w.isUnlocked())
        .toList();
    assertThat(locked).isNotEmpty();
    assertThat(wordService.list(null, null)).noneMatch(v -> locked.stream().anyMatch(w -> w.getWord().equals(v.word())));
  }

  @Test
  void openBundledWordsAreShown() {
    assertThat(wordService.list(null, null)).anyMatch(v -> v.word().equals("abandon"));
  }
}
