package com.example.backend.wordbook;

import com.example.backend.wordbook.WordbookWord.Source;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WordbookPickerTests {

  private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 14, 8, 0);
  private static final LocalDate TODAY = NOW.toLocalDate();

  private static WordbookWord word(long id, String text, WordbookColor color, String meaningJa) {
    WordbookWord w = new WordbookWord(1L, text, Source.MANUAL, NOW);
    w.setColor(color, NOW);
    w.editMeaning(meaningJa, NOW);
    try {
      var field = WordbookWord.class.getDeclaredField("id");
      field.setAccessible(true);
      field.set(w, id);
    } catch (ReflectiveOperationException e) {
      throw new IllegalStateException(e);
    }
    return w;
  }

  /** 出題済みで、復習日が今日から daysUntilDue 日後の語(0 以下なら復習日が来ている) */
  private static WordbookWord asked(long id, String text, WordbookColor color, int daysUntilDue) {
    WordbookWord w = word(id, text, color, "訳" + id);
    // 3日後が復習日になる「正解」を、daysUntilDue に合わせた日に解いたことにする
    w.recordAnswer(true, NOW.plusDays(daysUntilDue - WordbookWord.INTERVAL_DAYS[1]));
    return w;
  }

  private static int[] countPicks(List<WordbookWord> words, int times, long seed) {
    Random random = new Random(seed);
    int[] counts = new int[words.size() + 1];
    for (int i = 0; i < times; i++) {
      counts[WordbookPicker.pick(words, Set.of(), TODAY, random).getId().intValue()]++;
    }
    return counts;
  }

  @Test
  void newWordsAreChosenWithTheirColorWeights() {
    // まだ一度も出していない語だけのとき。覚えた(青)の語は後回しにする
    List<WordbookWord> words = List.of(
        word(1, "red", WordbookColor.RED, "赤"),
        word(2, "none", WordbookColor.NONE, "無"),
        word(3, "yellow", WordbookColor.YELLOW, "黄"),
        word(4, "blue", WordbookColor.BLUE, "青"));
    int[] counts = countPicks(words, 21_000, 42);
    // 重みは 赤10・無色10・黄10・青1 なので、青は 1/31、ほかは 10/31
    assertThat(counts[1]).isBetween(6500, 7100);
    assertThat(counts[2]).isBetween(6500, 7100);
    assertThat(counts[3]).isBetween(6500, 7100);
    assertThat(counts[4]).isBetween(450, 900);
  }

  @Test
  void dueWordsAndNewWordsAreMixedByTheDueShare() {
    List<WordbookWord> words = List.of(
        asked(1, "due", WordbookColor.NONE, 0), // 復習日が来ている
        word(2, "fresh", WordbookColor.NONE, "新"), // 新規
        asked(3, "later", WordbookColor.NONE, 5)); // 復習日はまだ先
    int[] counts = countPicks(words, 10_000, 7);

    assertThat(counts[1]).isBetween(5700, 6300); // 60%
    assertThat(counts[2]).isBetween(3700, 4300); // 40%
    assertThat(counts[3]).isZero(); // 復習日が来ていない語は、復習日が来た語か新規の語があるうちは出さない
  }

  @Test
  void dueWordsComeFirstWhenThereAreNoNewWords() {
    List<WordbookWord> words = List.of(
        asked(1, "due", WordbookColor.NONE, -2),
        asked(2, "later", WordbookColor.NONE, 6));
    int[] counts = countPicks(words, 500, 3);
    assertThat(counts[1]).isEqualTo(500);
  }

  @Test
  void redWordsAreChosenMoreOftenAmongDueWords() {
    List<WordbookWord> words = List.of(
        asked(1, "red", WordbookColor.RED, 0),
        asked(2, "none", WordbookColor.NONE, 0),
        asked(3, "blue", WordbookColor.BLUE, 0));
    int[] counts = countPicks(words, 14_000, 11);
    // 重みは 赤4・無色2・青1 なので 4/7・2/7・1/7
    assertThat(counts[1]).isBetween(7700, 8300);
    assertThat(counts[2]).isBetween(3750, 4250);
    assertThat(counts[3]).isBetween(1800, 2200);
  }

  @Test
  void whenNothingIsDueOrNewScheduledWordsAreChosenByColorWeight() {
    List<WordbookWord> words = List.of(
        asked(1, "none", WordbookColor.NONE, 4),
        asked(2, "blue", WordbookColor.BLUE, 4));
    int[] counts = countPicks(words, 13_000, 5);
    // 重みは 無色25・青1
    assertThat(counts[1]).isBetween(12300, 12700);
    assertThat(counts[2]).isBetween(300, 700);
  }

  @Test
  void everyNewWordIsShownOnceBeforeAnyWordRepeats() {
    List<WordbookWord> words = List.of(
        word(1, "a", WordbookColor.NONE, "あ"),
        word(2, "b", WordbookColor.NONE, "い"),
        word(3, "c", WordbookColor.NONE, "う"),
        word(4, "d", WordbookColor.BLUE, "え"));
    Random random = new Random(9);
    java.util.Set<Long> shown = new java.util.HashSet<>();
    for (int i = 0; i < words.size(); i++) {
      WordbookWord picked = WordbookPicker.pick(words, Set.of(), TODAY, random);
      assertThat(shown).doesNotContain(picked.getId());
      shown.add(picked.getId());
      // 解答した(正解)ので、新規ではなくなる
      picked.recordAnswer(true, NOW);
    }
    assertThat(shown).hasSize(4);
  }

  @Test
  void recentlyShownWordsAreSkippedUnlessNothingElseIsLeft() {
    List<WordbookWord> words = List.of(
        word(1, "a", WordbookColor.RED, "あ"),
        word(2, "b", WordbookColor.RED, "い"));
    Random random = new Random(1);
    for (int i = 0; i < 50; i++) {
      assertThat(WordbookPicker.pick(words, Set.of(1L), TODAY, random).getId()).isEqualTo(2L);
    }
    // 候補が全部直近なら、除外を外して出す(出題が止まらないように)
    assertThat(WordbookPicker.pick(words, Set.of(1L, 2L), TODAY, random)).isNotNull();
  }

  @Test
  void emptyCandidatesFail() {
    assertThatThrownBy(() -> WordbookPicker.pick(List.of(), Set.of(), TODAY, new Random(1)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void distractorsAreDistinctAndNeverTheCorrectMeaningOrSameWord() {
    WordbookWord correct = word(1, "run", WordbookColor.NONE, "走る");
    List<WordbookWord> pool = List.of(
        correct,
        word(2, "ran", WordbookColor.NONE, "走った"),
        word(3, "bank", WordbookColor.NONE, "走る"),
        word(4, "p", WordbookColor.NONE, "ア"),
        word(5, "q", WordbookColor.NONE, "イ"),
        word(6, "r", WordbookColor.NONE, "ウ"));

    List<String> wrong = WordbookPicker.distractors(correct, pool, 3, new Random(7));

    // 同じ語の変化形(ran)と、正解と同じ訳(bank)は誤答にしない
    assertThat(wrong).containsExactlyInAnyOrder("ア", "イ", "ウ");
  }

  @Test
  void distractorsFailWhenTooFewMeanings() {
    WordbookWord correct = word(1, "run", WordbookColor.NONE, "走る");
    assertThatThrownBy(() -> WordbookPicker.distractors(correct, List.of(correct), 3, new Random(1)))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
