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

  /** 出題済みの語。最後に出したのは daysAgo 日前で、そのとき正解した(復習日はまだ先) */
  private static WordbookWord answeredDaysAgo(long id, String text, WordbookColor color, int daysAgo) {
    WordbookWord w = word(id, text, color, "訳" + id);
    w.recordAnswer(true, NOW.minusDays(daysAgo));
    return w;
  }

  @Test
  void uncoloredWordsAreChosenNinetyPercentWhileColoredWordsAreDue() {
    List<WordbookWord> words = List.of(
        asked(1, "due", WordbookColor.RED, 0), // 復習日が来ている(間違えて赤になった語)
        word(2, "fresh", WordbookColor.NONE, "新")); // 色を決めていない語
    int[] counts = countPicks(words, 10_000, 8);
    // 無色が9割、復習日が来た語が1割(復習が止まらないように)
    assertThat(counts[2]).isBetween(8800, 9200);
    assertThat(counts[1]).isBetween(800, 1200);
  }

  @Test
  void onlyUncoloredWordsAreChosenWhenNothingIsDue() {
    List<WordbookWord> words = List.of(
        word(1, "fresh", WordbookColor.NONE, "新"),
        word(2, "colored", WordbookColor.BLUE, "青"), // 色付きの新規は無色の後
        answeredDaysAgo(3, "later", WordbookColor.YELLOW, 1)); // 復習日はまだ先
    assertThat(countPicks(words, 500, 3)[1]).isEqualTo(500);
  }

  @Test
  void answeredButUncoloredWordsComeBackUntilTheyAreColored() {
    // 正解しても色は付かないので、無色のまま。色を付けるまで優先して出す
    WordbookWord answered = answeredDaysAgo(1, "answered", WordbookColor.NONE, 1);
    assertThat(answered.getColor()).as("正解しても自動で色は付けない").isEqualTo(WordbookColor.NONE);
    List<WordbookWord> words = List.of(answered, word(2, "colored", WordbookColor.BLUE, "青"));
    assertThat(countPicks(words, 500, 4)[1]).isEqualTo(500);
  }

  @Test
  void neverAskedUncoloredWordsComeBeforeAnsweredOnesAndOldestAnsweredFirst() {
    List<WordbookWord> words = List.of(
        answeredDaysAgo(1, "recent", WordbookColor.NONE, 1),
        answeredDaysAgo(2, "old", WordbookColor.NONE, 5),
        word(3, "fresh", WordbookColor.NONE, "新"));
    Random random = new Random(5);
    assertThat(WordbookPicker.pick(words, Set.of(), TODAY, random).getId()).isEqualTo(3L);
    // まだ出していない語が無ければ、最後に出したのが古い語から
    assertThat(WordbookPicker.pick(words, Set.of(3L), TODAY, random).getId()).isEqualTo(2L);
    assertThat(WordbookPicker.pick(words, Set.of(3L, 2L), TODAY, random).getId()).isEqualTo(1L);
  }

  @Test
  void whenNoUncoloredWordIsLeftDueWordsComeBeforeColoredNewWords() {
    List<WordbookWord> words = List.of(
        asked(1, "due", WordbookColor.RED, 0),
        word(2, "colored", WordbookColor.BLUE, "青"));
    assertThat(countPicks(words, 500, 6)[1]).isEqualTo(500);
  }

  @Test
  void redWordsAreChosenMoreOftenAmongDueWords() {
    List<WordbookWord> words = List.of(
        asked(1, "red", WordbookColor.RED, 0),
        asked(2, "yellow", WordbookColor.YELLOW, 0),
        asked(3, "blue", WordbookColor.BLUE, 0));
    int[] counts = countPicks(words, 14_000, 11);
    // 重みは 赤4・黄2・青1 なので 4/7・2/7・1/7
    assertThat(counts[1]).isBetween(7700, 8300);
    assertThat(counts[2]).isBetween(3750, 4250);
    assertThat(counts[3]).isBetween(1800, 2200);
  }

  @Test
  void whenNothingIsDueOrNewScheduledWordsAreChosenByColorWeight() {
    List<WordbookWord> words = List.of(
        answeredDaysAgo(1, "red", WordbookColor.RED, 1),
        answeredDaysAgo(2, "blue", WordbookColor.BLUE, 1));
    int[] counts = countPicks(words, 12_000, 5);
    // 重みは 赤5・青1
    assertThat(counts[1]).isBetween(9700, 10300);
    assertThat(counts[2]).isBetween(1700, 2300);
  }

  @Test
  void inOneSessionUncoloredWordsComeFirstAndNoWordRepeats() {
    List<WordbookWord> words = List.of(
        word(1, "a", WordbookColor.NONE, "あ"),
        word(2, "b", WordbookColor.NONE, "い"),
        word(3, "c", WordbookColor.NONE, "う"),
        word(4, "d", WordbookColor.BLUE, "え"));
    Random random = new Random(9);
    Set<Long> shown = new java.util.HashSet<>();
    for (int i = 0; i < words.size(); i++) {
      WordbookWord picked = WordbookPicker.pick(words, shown, TODAY, random);
      assertThat(shown).doesNotContain(picked.getId());
      if (i < 3) {
        assertThat(picked.getColor()).as("無色の3語を先に出す").isEqualTo(WordbookColor.NONE);
      }
      shown.add(picked.getId());
      picked.recordAnswer(true, NOW);
    }
    assertThat(shown).hasSize(4);
  }

  @Test
  void wordsShownBeforeReturningHomeAreNeverShownAgain() {
    List<WordbookWord> words = List.of(
        word(1, "a", WordbookColor.RED, "あ"),
        word(2, "b", WordbookColor.RED, "い"));
    Random random = new Random(1);
    for (int i = 0; i < 50; i++) {
      assertThat(WordbookPicker.pick(words, Set.of(1L), TODAY, random).getId()).isEqualTo(2L);
    }
    // 全部出したら、出し直さずに知らせる(ホームに戻ると、また出せる)
    assertThatThrownBy(() -> WordbookPicker.pick(words, Set.of(1L, 2L), TODAY, random))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("ホームに戻る");
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

  private static WordbookWord withPos(long id, String text, String pos, String meaningJa) {
    WordbookWord w = word(id, text, WordbookColor.NONE, meaningJa);
    try {
      var field = WordbookWord.class.getDeclaredField("pos");
      field.setAccessible(true);
      field.set(w, pos);
    } catch (ReflectiveOperationException e) {
      throw new IllegalStateException(e);
    }
    return w;
  }

  @Test
  void distractorsPreferTheSamePartOfSpeech() {
    WordbookWord correct = withPos(1, "abolish", "v", "を廃止する");
    List<WordbookWord> pool = List.of(
        correct,
        withPos(2, "abandon", "v", "を捨てる"),
        withPos(3, "boost", "v", "を押し上げる"),
        withPos(4, "curb", "v", "を抑制する"),
        withPos(5, "abundant", "adj", "豊富な"),
        withPos(6, "adequate", "adj", "十分な"),
        withPos(7, "backlog", "n", "未処理分"),
        withPos(8, "bias", "n", "偏見"));

    for (long seed = 0; seed < 30; seed++) {
      // 他動詞の「を〜」の語が3つあるので、誤答は全部「を〜」になる(訳の形だけで正解を選べない)
      assertThat(WordbookPicker.distractors(correct, pool, 3, new Random(seed)))
          .containsExactlyInAnyOrder("を捨てる", "を押し上げる", "を抑制する");
    }
  }

  @Test
  void distractorsFillFromOtherPartsOfSpeechWhenTheSameOnesRunOut() {
    WordbookWord correct = withPos(1, "abolish", "v", "を廃止する");
    List<WordbookWord> pool = List.of(
        correct,
        withPos(2, "abandon", "v", "を捨てる"),
        withPos(5, "abundant", "adj", "豊富な"),
        withPos(7, "backlog", "n", "未処理分"));

    List<String> wrong = WordbookPicker.distractors(correct, pool, 3, new Random(3));

    assertThat(wrong).containsExactlyInAnyOrder("を捨てる", "豊富な", "未処理分");
  }

  @Test
  void wordsWithoutAPartOfSpeechUseAnyDistractor() {
    WordbookWord correct = word(1, "mine", WordbookColor.NONE, "私の");
    List<WordbookWord> pool = List.of(
        correct,
        withPos(2, "a", "v", "を捨てる"),
        withPos(3, "b", "adj", "豊富な"),
        withPos(4, "c", "n", "偏見"));

    assertThat(WordbookPicker.distractors(correct, pool, 3, new Random(1)))
        .containsExactlyInAnyOrder("を捨てる", "豊富な", "偏見");
  }

  @Test
  void distractorsAvoidMeaningsThatOverlapWithTheCorrectOne() {
    // 「妨げる」を含む類義語の訳は、正解と紛らわしいので誤答にしない(ほかに十分な候補があるとき)
    WordbookWord correct = withPos(1, "hamper", "v", "を妨げる");
    List<WordbookWord> pool = List.of(
        correct,
        withPos(2, "inhibit", "v", "を抑制する、妨げる"),
        withPos(3, "preclude", "v", "を妨げる、不可能にする"),
        withPos(4, "abandon", "v", "を捨てる"),
        withPos(5, "boost", "v", "を押し上げる"),
        withPos(6, "curb", "v", "を食い止める"),
        withPos(7, "abolish", "v", "を廃止する"));

    for (long seed = 0; seed < 30; seed++) {
      assertThat(WordbookPicker.distractors(correct, pool, 3, new Random(seed)))
          .doesNotContain("を抑制する、妨げる", "を妨げる、不可能にする");
    }
  }

  @Test
  void overlapIgnoresTheLeadingParticleAndParentheses() {
    assertThat(WordbookPicker.overlaps("を妨げる", "を抑制する、妨げる")).isTrue();
    assertThat(WordbookPicker.overlaps("を制定する", "(法律)を制定する")).isTrue();
    assertThat(WordbookPicker.overlaps("豊富な", "十分な、適切な")).isFalse();
  }
}
