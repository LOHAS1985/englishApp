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

  @Test
  void everyVocabQuestionHasAnAuthoredDifficulty() {
    for (ChoiceQuestion q : new VocabQuestionBank(MAPPER).all()) {
      assertThat(q.difficulty()).as(q.id()).isNotNull().isBetween(1, Difficulty.MAX_LEVEL);
    }
  }

  /**
   * 文法・語彙・読解は、基礎・標準・発展の問題がそれぞれ1問以上あること(どれかを選ぶと問題が尽きる、を防ぐ)。
   * 判定の分布は形式によって偏る(英検の大問2 は標準が多い)ため、比率では検査しない。
   * リスニングは従来どおり、基礎を1割以上、標準・発展を2割以上とする(目標の分布 10/20/30/20/20%。
   * docs/question-authoring.md の 1.1)。
   */
  @Test
  void eachBankHasAllThreeLevels() {
    GrammarQuestionBank grammar = new GrammarQuestionBank(MAPPER);
    VocabQuestionBank vocab = new VocabQuestionBank(MAPPER);
    assertSpread("grammar", grammar.ids(), grammar::difficulty, 1, 1);
    assertSpread("vocab", vocab.ids(), vocab::difficulty, 1, 1);
    ReadingQuestionBank reading = new ReadingQuestionBank(MAPPER);
    reading.countByType().keySet().forEach(type -> assertSpread(type, reading.ids(type), reading::difficulty, 1, 1));
    ListeningQuestionBank listening = new ListeningQuestionBank(MAPPER);
    listening.countByType().keySet().forEach(type -> {
      List<String> ids = listening.ids(type);
      assertSpread(type, ids, listening::difficulty, ids.size() / 10, ids.size() / 5);
    });
  }

  /** level1Min・otherMin: 基礎・標準・発展のそれぞれに必要な問題数の下限 */
  private static void assertSpread(String name, List<String> ids, Function<String, Integer> difficulty, int level1Min,
      int otherMin) {
    Map<Integer, Integer> counts = new TreeMap<>();
    ids.forEach(id -> counts.merge(difficulty.apply(id), 1, Integer::sum));
    System.out.println(name + ": " + counts);
    for (int level = 1; level <= 3; level++) {
      int min = level == 1 ? level1Min : otherMin;
      assertThat(counts.getOrDefault(level, 0)).as(name + " level " + level).isGreaterThanOrEqualTo(min);
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
