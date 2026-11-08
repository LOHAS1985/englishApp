package com.example.backend.common;

import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.grammar.GrammarQuestionBank;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.reading.ReadingQuestionBank;
import com.example.backend.vocab.VocabQuestionBank;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;

class DifficultyTests {

  private static final JsonMapper MAPPER = JsonMapper.builder().build();

  record Item(String id, Integer explicit, double score) {
  }

  @Test
  void estimatedDifficultySplitsEachGroupIntoThirdsAndExplicitValuesWin() {
    List<Item> items = List.of(new Item("a", null, 1), new Item("b", null, 2), new Item("c", null, 3),
        new Item("d", null, 4), new Item("e", null, 5), new Item("f", null, 6), new Item("g", 1, 100));
    Map<String, Integer> d = Difficulty.assign(items, Item::id, Item::explicit, i -> "x", Item::score);
    assertThat(d).containsEntry("a", 1).containsEntry("b", 1).containsEntry("c", 2).containsEntry("d", 2)
        .containsEntry("e", 3).containsEntry("f", 3).containsEntry("g", 1);
  }

  private static List<Difficulty.Answer> answers(int level, int total, int correct) {
    return java.util.stream.IntStream.range(0, total).mapToObj(i -> new Difficulty.Answer(level, i < correct))
        .toList();
  }

  @Test
  void targetStepsFromTheLevelBeingSolvedByRecentAccuracy() {
    assertThat(Difficulty.target(answers(2, 3, 3))).as("解答が少ないうちは絞らない").isNull();
    assertThat(Difficulty.target(answers(2, 10, 10))).as("85%以上は1つ上").isEqualTo(3);
    assertThat(Difficulty.target(answers(2, 10, 7))).as("60〜85%は同じ").isEqualTo(2);
    assertThat(Difficulty.target(answers(2, 10, 5))).as("60%未満は1つ下").isEqualTo(1);
    assertThat(Difficulty.target(answers(1, 10, 0))).isEqualTo(Difficulty.EASY);
  }

  @Test
  void targetReachesLevelsFourAndFive() {
    assertThat(Difficulty.target(answers(3, 10, 10))).isEqualTo(4);
    assertThat(Difficulty.target(answers(4, 10, 10))).isEqualTo(5);
    assertThat(Difficulty.target(answers(5, 10, 10))).isEqualTo(Difficulty.MAX_LEVEL);
    // 新しい順に 難関 6問・発展 4問 → 平均 3.6 → 4。全問正解なので 5
    List<Difficulty.Answer> mixed = new java.util.ArrayList<>(answers(4, 6, 6));
    mixed.addAll(answers(3, 4, 4));
    assertThat(Difficulty.target(mixed)).isEqualTo(5);
  }

  @Test
  void pickerPrefersTheClosestDifficultyAmongUnansweredQuestions() {
    Map<String, Integer> d = Map.of("e1", 1, "n1", 2, "h1", 3, "h2", 3);
    assertThat(QuestionPicker.closestDifficulty(List.of("e1", "n1", "h1", "h2"), d::get, 3))
        .containsExactlyInAnyOrder("h1", "h2");
    // 発展が残っていなければ標準を出す
    assertThat(QuestionPicker.closestDifficulty(List.of("e1", "n1"), d::get, 3)).containsExactly("n1");
  }

  @Test
  void everyVocabQuestionHasAnAuthoredDifficulty() {
    for (ChoiceQuestion q : new VocabQuestionBank(MAPPER).all()) {
      assertThat(q.difficulty()).as(q.id()).isNotNull().isBetween(1, Difficulty.MAX_LEVEL);
    }
  }

  /** どの形式にも基礎・標準・発展がそれぞれ2割以上ある(どれかを選ぶと問題が尽きる、を防ぐ) */
  @Test
  void eachBankHasAllThreeLevels() {
    GrammarQuestionBank grammar = new GrammarQuestionBank(MAPPER);
    VocabQuestionBank vocab = new VocabQuestionBank(MAPPER);
    assertSpread("grammar", grammar.ids(), grammar::difficulty);
    assertSpread("vocab", vocab.ids(), vocab::difficulty);
    for (QuestionSetBank bank : List.of(new ReadingQuestionBank(MAPPER), new ListeningQuestionBank(MAPPER))) {
      bank.countByType().keySet().forEach(type -> assertSpread(type, bank.ids(type), bank::difficulty));
    }
  }

  private static void assertSpread(String name, List<String> ids, Function<String, Integer> difficulty) {
    Map<Integer, Integer> counts = new TreeMap<>();
    ids.forEach(id -> counts.merge(difficulty.apply(id), 1, Integer::sum));
    System.out.println(name + ": " + counts);
    for (int level = 1; level <= 3; level++) {
      assertThat(counts.getOrDefault(level, 0)).as(name + " level " + level).isGreaterThanOrEqualTo(ids.size() / 5);
    }
  }

  @Test
  void multiDocumentSetsScoreHigherThanSingleDocuments() {
    QuestionSet single = new QuestionSet("r1", "toeic-part7", "t", "word ".repeat(150), null, null, null, null,
        List.of(), null, null);
    QuestionSet multi = new QuestionSet("r2", "toeic-part7", "t",
        "【Document 1: E-mail】 " + "word ".repeat(100) + "【Document 2: Form】 " + "word ".repeat(50), null, null,
        null, null, List.of(), null, null);
    assertThat(Difficulty.setScore(multi)).isGreaterThan(Difficulty.setScore(single));
  }
}
