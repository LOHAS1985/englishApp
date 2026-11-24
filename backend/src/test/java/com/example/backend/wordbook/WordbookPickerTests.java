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
  void uncoloredUnseenWordsAreShownFirstBeforeAnyColoredNewWord() {
    List<WordbookWord> words = List.of(
        word(1, "red", WordbookColor.RED, "赤"),
        word(2, "none", WordbookColor.NONE, "無"),
        word(3, "yellow", WordbookColor.YELLOW, "黄"),
        word(4, "none2", WordbookColor.NONE, "無2"),
        word(5, "blue", WordbookColor.BLUE, "青"));
    Random random = new Random(4);
    Set<Long> shown = new java.util.HashSet<>();
    // 最初の2問は、色を決めていない2語
    for (int i = 0; i < 2; i++) {
      WordbookWord picked = WordbookPicker.pick(words, Set.of(), TODAY, random);
      assertThat(picked.getColor()).isEqualTo(WordbookColor.NONE);
      picked.recordAnswer(true, NOW);
      shown.add(picked.getId());
    }
    assertThat(shown).containsExactlyInAnyOrder(2L, 4L);
    // そのあとは色付きの語も出る(3語の中から)
    for (int i = 0; i < 3; i++) {
      WordbookWord picked = WordbookPicker.pick(words, Set.of(), TODAY, random);
      assertThat(picked.getColor()).isNotEqualTo(WordbookColor.NONE);
      picked.recordAnswer(true, NOW);
    }
  }

  @Test
  void uncoloredWordsAreEachShownOnceInTheFirstPassWhileRandomOrder() {
    List<WordbookWord> words = List.of(
        word(1, "a", WordbookColor.NONE, "あ"),
        word(2, "b", WordbookColor.NONE, "い"),
        word(3, "c", WordbookColor.NONE, "う"),
        word(4, "d", WordbookColor.NONE, "え"));
    Set<Long> seen = new java.util.HashSet<>();
    for (long seed = 0; seed < 20; seed++) {
      seen.clear();
      Random random = new Random(seed);
      List<WordbookWord> run = words.stream().map(w -> word(w.getId(), w.getWord(), WordbookColor.NONE, w.getMeaningJa())).toList();
      for (int i = 0; i < run.size(); i++) {
        WordbookWord picked = WordbookPicker.pick(run, Set.of(), TODAY, random);
        assertThat(seen.add(picked.getId())).as("一周目で同じ語が繰り返された(seed " + seed + ")").isTrue();
        picked.recordAnswer(true, NOW);
      }
    }
  }


  @Test
  void uncoloredNewWordsComeBeforeDueWords() {
    List<WordbookWord> words = List.of(
        asked(1, "due", WordbookColor.RED, 0), // 復習日が来ている(間違えて赤になった語)
        word(2, "fresh", WordbookColor.NONE, "新"), // 色を決めていない新規
        asked(3, "later", WordbookColor.NONE, 5)); // 復習日はまだ先
    Random random = new Random(8);
    for (int i = 0; i < 200; i++) {
      assertThat(WordbookPicker.pick(words, Set.of(), TODAY, random).getId()).isEqualTo(2L);
    }
  }

  @Test
  void dueWordsComeAfterTheFirstPassAndBeforeColoredNewWords() {
    WordbookWord fresh = word(2, "fresh", WordbookColor.NONE, "新");
    List<WordbookWord> words = List.of(
        asked(1, "due", WordbookColor.RED, 0),
        fresh,
        word(4, "colored", WordbookColor.BLUE, "青")); // 色付きの新規は復習より後
    Random random = new Random(8);
    assertThat(WordbookPicker.pick(words, Set.of(), TODAY, random).getId()).isEqualTo(2L);
    fresh.recordAnswer(true, NOW);
    // 無色の新規が無くなったら、復習日が来た語
    for (int i = 0; i < 200; i++) {
      assertThat(WordbookPicker.pick(words, Set.of(), TODAY, random).getId()).isEqualTo(1L);
    }
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
