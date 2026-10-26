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
  private static final Set<String> LISTENING_TYPES = Set.of("toeic-part3", "toeic-part4", "eiken-part1",
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
    }
    assertSpread(all.stream().flatMap(s -> s.questions().stream()).map(SetQuestion::answer).toList());
  }

  @Test
  void listeningSetsAreWellFormed() {
    List<QuestionSet> all = new ListeningQuestionBank(MAPPER).all();
    assertThat(all).isNotEmpty();
    for (QuestionSet s : all) {
      assertThat(s.id()).matches("l\\d{4}");
      assertThat(s.type()).as(s.id()).isIn(LISTENING_TYPES);
      assertThat(s.script()).as(s.id()).isNotBlank();
      // TTS は行頭の「話者:」で声を切り替える。"Woman 2" のような名前は男性の声になるため3種類に限定
      for (String line : s.script().split("\n")) {
        assertThat(line).as(s.id() + " script line").matches("^(Man|Woman|Narrator): .+");
      }
      if (s.type().equals("eiken-part3")) {
        assertThat(s.situation()).as(s.id() + " situation").isNotBlank();
      }
      assertQuestions(s, 4);
    }
    assertSpread(all.stream().flatMap(s -> s.questions().stream()).map(SetQuestion::answer).toList());
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
