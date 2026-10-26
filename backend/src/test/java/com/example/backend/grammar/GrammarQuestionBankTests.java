package com.example.backend.grammar;

import com.example.backend.grammar.GrammarQuestionBank.BankQuestion;
import com.example.backend.grammar.dto.GrammarChoice;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** 問題集(questions/grammar/*.json)の形式チェック。問題を追加・修正したら CI で自動的に検証される */
class GrammarQuestionBankTests {

  private final GrammarQuestionBank bank = new GrammarQuestionBank(JsonMapper.builder().build());

  GrammarQuestionBankTests() throws Exception {
  }

  @Test
  void everyQuestionIsWellFormed() {
    List<BankQuestion> all = bank.all();
    assertThat(all).isNotEmpty();

    for (BankQuestion q : all) {
      assertThat(q.id()).as("id").matches("g\\d{4}");
      assertThat(q.sentence()).as(q.id() + " sentence").contains("-------");
      assertThat(q.choices()).as(q.id() + " choices")
          .extracting(GrammarChoice::label).containsExactly("A", "B", "C", "D");
      assertThat(q.choices()).as(q.id() + " choice texts")
          .extracting(GrammarChoice::text).allMatch(t -> t != null && !t.isBlank()).doesNotHaveDuplicates();
      assertThat(q.answer()).as(q.id() + " answer").isIn("A", "B", "C", "D");
      assertThat(q.point()).as(q.id() + " point").isNotBlank();
      assertThat(q.explanation()).as(q.id() + " explanation").isNotBlank();
      assertThat(q.translation()).as(q.id() + " translation").isNotBlank();
    }
  }

  @Test
  void answersAreSpreadAcrossAllLetters() {
    // 正解の記号が偏ると、問題を読まずに当てられてしまう
    long total = bank.all().size();
    for (String letter : List.of("A", "B", "C", "D")) {
      long count = bank.all().stream().filter(q -> q.answer().equals(letter)).count();
      assertThat(count).as("answer " + letter).isBetween(total / 8, total * 3 / 8);
    }
  }
}
