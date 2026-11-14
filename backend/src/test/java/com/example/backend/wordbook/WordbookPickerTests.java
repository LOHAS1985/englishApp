package com.example.backend.wordbook;

import com.example.backend.wordbook.WordbookWord.Source;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WordbookPickerTests {

  private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 14, 8, 0);

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

  @Test
  void weightsFollowTheColor() {
    List<WordbookWord> words = List.of(
        word(1, "red", WordbookColor.RED, "赤"),
        word(2, "none", WordbookColor.NONE, "無"),
        word(3, "yellow", WordbookColor.YELLOW, "黄"),
        word(4, "blue", WordbookColor.BLUE, "青"));
    Random random = new Random(42);
    int[] counts = new int[5];
    for (int i = 0; i < 20_000; i++) {
      counts[WordbookPicker.pick(words, Set.of(), random).getId().intValue()]++;
    }
    // 重みは 赤5・無色5・黄2・青1 なので、赤と無色はおよそ 5/13、黄は 2/13、青は 1/13
    assertThat(counts[1]).isBetween(7300, 8200);
    assertThat(counts[2]).isBetween(7300, 8200);
    assertThat(counts[3]).isBetween(2800, 3400);
    assertThat(counts[4]).isBetween(1300, 1800);
  }

  @Test
  void recentlyShownWordsAreSkippedUnlessNothingElseIsLeft() {
    List<WordbookWord> words = List.of(
        word(1, "a", WordbookColor.RED, "あ"),
        word(2, "b", WordbookColor.RED, "い"));
    Random random = new Random(1);
    for (int i = 0; i < 50; i++) {
      assertThat(WordbookPicker.pick(words, Set.of(1L), random).getId()).isEqualTo(2L);
    }
    // 候補が全部直近なら、除外を外して出す(出題が止まらないように)
    assertThat(WordbookPicker.pick(words, Set.of(1L, 2L), random)).isNotNull();
  }

  @Test
  void emptyCandidatesFail() {
    assertThatThrownBy(() -> WordbookPicker.pick(List.of(), Set.of(), new Random(1)))
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
