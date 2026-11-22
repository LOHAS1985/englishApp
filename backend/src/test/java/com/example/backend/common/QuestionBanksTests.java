package com.example.backend.common;

import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.common.QuestionSetBank.SetQuestion;
import com.example.backend.grammar.dto.GrammarChoice;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.reading.ReadingQuestionBank;
import com.example.backend.speaking.SpeakingQuestionBank;
import com.example.backend.speaking.SpeakingQuestionBank.SpeakingSet;
import com.example.backend.vocab.VocabQuestionBank;
import com.example.backend.writing.WritingPromptBank;
import com.example.backend.writing.WritingPromptBank.WritingPrompt;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 語彙・リーディング・リスニング・ライティング・スピーキングの問題集の形式チェック。
 * 問題を追加・修正したら CI で自動的に検証される(文法は GrammarQuestionBankTests)。
 */
class QuestionBanksTests {

  private static final JsonMapper MAPPER = JsonMapper.builder().build();
  private static final List<String> LETTERS = List.of("A", "B", "C", "D");
  private static final Set<String> READING_TYPES = Set.of("toeic-part6", "toeic-part7", "eiken-cloze", "eiken-long");
  private static final Set<String> LISTENING_TYPES = Set.of("toeic-part2", "toeic-part3", "toeic-part4", "eiken-part1",
      "eiken-part2", "eiken-part3");

  @Test
  void vocabQuestionsAreWellFormed() {
    List<ChoiceQuestion> all = new VocabQuestionBank(MAPPER).all();
    assertThat(all).isNotEmpty();
    for (ChoiceQuestion q : all) {
      assertThat(q.id()).matches("v\\d{4}");
      assertThat(q.sentence()).as(q.id()).contains("-------");
      assertThat(q.choices()).as(q.id()).extracting(GrammarChoice::label).containsExactlyElementsOf(LETTERS);
      assertThat(q.choices()).as(q.id()).extracting(GrammarChoice::text).doesNotHaveDuplicates()
          .allMatch(t -> t != null && !t.isBlank());
      assertThat(q.answer()).as(q.id()).isIn(LETTERS);
      assertThat(q.explanation()).as(q.id()).isNotBlank();
      assertThat(q.translation()).as(q.id()).isNotBlank();
    }
    assertSpread(all.stream().map(ChoiceQuestion::answer).toList());
    // 同じ英文の問題が2つあると、一巡するまでに同じ問題を2回解くことになる
    assertThat(all).extracting(q -> q.sentence().trim().toLowerCase()).doesNotHaveDuplicates();
  }

  @Test
  void readingSetsAreWellFormed() {
    List<QuestionSet> all = new ReadingQuestionBank(MAPPER).all();
    assertThat(all).isNotEmpty();
    for (QuestionSet s : all) {
      assertThat(s.id()).matches("r\\d{4}");
      assertThat(s.type()).as(s.id()).isIn(READING_TYPES);
      assertThat(s.passage()).as(s.id()).isNotBlank();
      assertQuestions(s, 4);
      if (s.type().equals("toeic-part6") || s.type().equals("eiken-cloze")) {
        // 空所 [1] [2] ... が設問の数だけ本文にある
        for (int i = 1; i <= s.questions().size(); i++) {
          assertThat(s.passage()).as(s.id() + " blank " + i).contains("[" + i + "]");
        }
      }
      if (s.type().equals("eiken-long")) {
        // 本番の英検準1級 大問3 と同じ長さで練習する
        int words = s.passage().trim().split("\\s+").length;
        assertThat(words).as(s.id() + " passage words").isBetween(400, 550);
      }
    }
    assertSpread(all.stream().flatMap(s -> s.questions().stream()).map(SetQuestion::answer).toList());
    assertSpreadPerFormat(all);
    assertThat(all).extracting(s -> s.title().trim().toLowerCase()).as("reading titles").doesNotHaveDuplicates();
  }

  @Test
  void listeningSetsAreWellFormed() {
    List<QuestionSet> all = new ListeningQuestionBank(MAPPER).all();
    assertThat(all).isNotEmpty();
    for (QuestionSet s : all) {
      assertThat(s.id()).matches("l\\d{4}");
      assertThat(s.type()).as(s.id()).isIn(LISTENING_TYPES);
      assertThat(s.script()).as(s.id()).isNotBlank();
      // TTS は行頭の「話者:」で声を切り替える。3人の会話(TOEIC Part 3)用に "Man 2" / "Woman 2" まで使える
      for (String line : s.script().split("\n")) {
        assertThat(line).as(s.id() + " script line").matches("^(Man|Woman|Man 2|Woman 2|Narrator): .+");
      }
      // 図表問題(Look at the graphic.)には、画面に表示する図表が必要
      if (s.questions().stream().anyMatch(q -> q.question().startsWith("Look at the graphic"))) {
        assertThat(s.graphic()).as(s.id() + " graphic").isNotBlank();
      }
      if (s.type().equals("eiken-part3")) {
        assertThat(s.situation()).as(s.id() + " situation").isNotBlank();
      }
      if (s.type().equals("toeic-part2")) {
        // 本番と同じ3択。台本は設問から組み立てる(ListeningQuestionBank)ので、解説は記号でなく語句で書く
        assertThat(s.questions()).as(s.id()).hasSize(5);
        assertQuestions(s, 3);
        for (SetQuestion q : s.questions()) {
          assertThat(s.script()).as(s.id() + " script").contains(q.question())
              .contains("(A) " + q.choices().get(0)).contains("(C) " + q.choices().get(2));
        }
      } else {
        assertQuestions(s, 4);
      }
    }
    assertSpread(all.stream().flatMap(s -> s.questions().stream()).map(SetQuestion::answer).toList());
    assertSpreadPerFormat(all);
  }

  /**
   * 正解の選択肢が一番長い割合の上限(形式ごと)。正解だけが長く詳しいと、本文を理解しなくても当たってしまい、
   * 正答率が実力より高く出る(docs/question-authoring.md の「4.1」で禁止している書き方)。
   * 偶然なら 4択 25%・3択(Part 2)33%。いまの割合に少し余裕を足した値で、これ以上悪化させないための上限。
   * 誤答を作り直して下がったら、この値も下げる(目標は偶然 + 10 ポイント程度)。
   */
  private static final java.util.Map<String, Integer> LONGEST_CORRECT_CEILING_PERCENT = java.util.Map.ofEntries(
      java.util.Map.entry("eiken-long", 86),
      java.util.Map.entry("toeic-part2", 75),
      java.util.Map.entry("eiken-part1", 56),
      java.util.Map.entry("eiken-part2", 52),
      java.util.Map.entry("eiken-part3", 54),
      java.util.Map.entry("toeic-part3", 52),
      java.util.Map.entry("toeic-part4", 50),
      java.util.Map.entry("toeic-part7", 47),
      java.util.Map.entry("eiken-cloze", 32),
      java.util.Map.entry("toeic-part6", 31));

  @Test
  void correctChoiceIsNotTooOftenTheLongest() {
    List<QuestionSet> all = new java.util.ArrayList<>(new ReadingQuestionBank(MAPPER).all());
    all.addAll(new ListeningQuestionBank(MAPPER).all());

    java.util.Map<String, long[]> byType = new java.util.TreeMap<>(); // {正解が最長の数, 設問数}
    for (QuestionSet s : all) {
      for (SetQuestion q : s.questions()) {
        int answerLength = q.choices().get(LETTERS.indexOf(q.answer())).length();
        int max = q.choices().stream().mapToInt(String::length).max().orElse(0);
        boolean uniquelyLongest = answerLength == max && q.choices().stream().filter(c -> c.length() == max).count() == 1;
        long[] counts = byType.computeIfAbsent(s.type(), k -> new long[2]);
        counts[0] += uniquelyLongest ? 1 : 0;
        counts[1]++;
      }
    }

    assertThat(byType.keySet()).as("上限を決めていない形式がある").isSubsetOf(LONGEST_CORRECT_CEILING_PERCENT.keySet());
    byType.forEach((type, counts) -> {
      long percent = Math.round(counts[0] * 100.0 / counts[1]);
      assertThat(percent).as(type + ": 正解が一番長い設問の割合(%) " + counts[0] + "/" + counts[1])
          .isLessThanOrEqualTo(LONGEST_CORRECT_CEILING_PERCENT.get(type));
    });
  }

  @Test
  void writingPromptsAreWellFormed() {
    List<WritingPrompt> all = new WritingPromptBank(MAPPER).all();
    assertThat(all).isNotEmpty();
    for (WritingPrompt p : all) {
      assertThat(p.id()).matches("w\\d{4}");
      assertThat(p.type()).as(p.id()).isIn("opinion", "summary");
      assertThat(p.topic()).as(p.id()).isNotBlank();
      if (p.isSummary()) {
        assertThat(p.passage()).as(p.id()).isNotBlank();
        int words = p.passage().trim().split("\\s+").length;
        assertThat(words).as(p.id() + " passage words").isBetween(160, 300);
      } else {
        assertThat(p.points()).as(p.id()).hasSize(4).doesNotHaveDuplicates();
      }
    }
    // 同じお題が2回出ないようにする
    assertThat(all).extracting(p -> p.topic().trim().toLowerCase()).as("writing topics").doesNotHaveDuplicates();
  }

  @Test
  void speakingSetsAreWellFormed() {
    List<SpeakingSet> all = new SpeakingQuestionBank(MAPPER).all();
    assertThat(all).isNotEmpty();
    for (SpeakingSet s : all) {
      assertThat(s.id()).matches("s\\d{4}");
      assertThat(s.firstSentence()).as(s.id()).isNotBlank();
      assertThat(s.scenes()).as(s.id()).hasSize(4);
      assertThat(s.narrationSample()).as(s.id()).isNotBlank();
      assertThat(s.questions()).as(s.id()).hasSize(3)
          .allMatch(q -> !q.question().isBlank() && !q.sampleAnswer().isBlank());
    }
  }

  private static void assertQuestions(QuestionSet s, int choiceCount) {
    assertThat(s.questions()).as(s.id()).isNotEmpty();
    for (SetQuestion q : s.questions()) {
      assertThat(q.question()).as(s.id()).isNotBlank();
      assertThat(q.choices()).as(s.id() + " " + q.question()).hasSize(choiceCount).doesNotHaveDuplicates()
          .allMatch(c -> c != null && !c.isBlank());
      assertThat(q.answer()).as(s.id()).isIn(LETTERS.subList(0, choiceCount));
      assertThat(q.explanation()).as(s.id()).isNotBlank();
    }
  }

  /**
   * 形式ごとの正解の記号の偏り。全体で揃っていても、形式によって偏ると(例: 英検 Part 3 の D が4割)、
   * その形式の模試で記号を当てられてしまう(模試は選択肢を並べ替えない)。
   * 選択肢が k 個なら、各記号の割合は 0.6/k〜1.4/k に入ること(4択なら 15〜35%、3択なら 20〜47%)。
   * 件数が少ない形式(100問未満)は検査しない。
   */
  private static void assertSpreadPerFormat(List<QuestionSet> sets) {
    Map<String, List<SetQuestion>> byType = sets.stream()
        .flatMap(s -> s.questions().stream().map(q -> Map.entry(s.type(), q)))
        .collect(Collectors.groupingBy(Map.Entry::getKey, Collectors.mapping(Map.Entry::getValue, Collectors.toList())));
    byType.forEach((type, questions) -> {
      if (questions.size() < 100) return;
      int k = questions.get(0).choices().size();
      for (int i = 0; i < k; i++) {
        String letter = LETTERS.get(i);
        double share = questions.stream().filter(q -> letter.equals(q.answer())).count() / (double) questions.size();
        assertThat(share).as(type + " の正解が " + letter + " の割合").isBetween(0.6 / k, 1.4 / k);
      }
    });
  }

  /** 正解の記号が偏ると、問題を読まずに当てられてしまう(件数が少ないうちは検査しない) */
  private static void assertSpread(List<String> answers) {
    if (answers.size() < 40)
      return;
    for (String letter : LETTERS) {
      long count = answers.stream().filter(letter::equals).count();
      assertThat(count).as("answer " + letter).isBetween(answers.size() / 8L, answers.size() * 3L / 8);
    }
  }
}
