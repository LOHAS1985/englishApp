package com.example.backend.common;

import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.common.QuestionSetBank.SetQuestion;
import com.example.backend.grammar.GrammarQuestionBank;
import com.example.backend.grammar.dto.GrammarChoice;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.reading.ReadingQuestionBank;
import com.example.backend.vocab.VocabQuestionBank;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 画面に同梱する問題集(frontend/src/generated/questions/*.json)が、バックエンドの問題集と一致しているか。
 *
 * <p>
 * 画面はサーバーの起動を待たずに出題するため、問題集を同梱している。難易度の推定や TOEIC Part 2 の台本の組み立ては
 * Java 側の処理を正とし、その結果をこのテストで書き出す。問題集を変えたのに書き出し直していなければ CI で失敗する。
 * 書き出し直すには {@code ./scripts/export-questions.sh}(-Dexport.write=true でこのテストを実行)。
 */
class QuestionExportTests {

  private static final JsonMapper MAPPER = JsonMapper.builder().build();
  private static final Path OUT = Path.of("..", "frontend", "src", "generated", "questions");

  /** 4択短文問題(文法・語彙)。正解・解説も含む(利用者は本人だけなので、画面から見えてもよい) */
  record ChoiceExport(String id, String sentence, List<GrammarChoice> choices, String answer, String explanation,
      String translation, int difficulty) {
  }

  record SetQuestionExport(String question, List<String> choices, String answer, String explanation) {
  }

  /** セット問題(読解・リスニング)。script は Part 2 も組み立て済みのもの */
  record SetExport(String id, String type, String title, String passage, String situation, String graphic,
      String script, String translation, List<SetQuestionExport> questions, int difficulty, String theme) {
  }

  @Test
  void frontendQuestionBanksAreUpToDate() throws IOException {
    GrammarQuestionBank grammar = new GrammarQuestionBank(MAPPER);
    VocabQuestionBank vocab = new VocabQuestionBank(MAPPER);
    ReadingQuestionBank reading = new ReadingQuestionBank(MAPPER);
    ListeningQuestionBank listening = new ListeningQuestionBank(MAPPER);

    check("grammar", render(grammar.all().stream().map(q -> choice(grammar, q)).toList()));
    check("vocab", render(vocab.all().stream().map(q -> choice(vocab, q)).toList()));
    check("reading", render(reading.all().stream().map(s -> set(reading, s)).toList()));
    check("listening", render(listening.all().stream().map(s -> set(listening, s)).toList()));
  }

  private static ChoiceExport choice(ChoiceQuestionBank bank, ChoiceQuestion q) {
    return new ChoiceExport(q.id(), q.sentence(), q.choices(), q.answer(), q.explanation(), q.translation(),
        bank.difficulty(q.id()));
  }

  private static SetExport set(QuestionSetBank bank, QuestionSet s) {
    List<SetQuestionExport> questions = s.questions().stream()
        .map((SetQuestion q) -> new SetQuestionExport(q.question(), q.choices(), q.answer(), q.explanation()))
        .toList();
    return new SetExport(s.id(), s.type(), s.title(), s.passage(), s.situation(), s.graphic(), s.script(),
        s.translation(), questions, bank.difficulty(s.id()), s.theme());
  }

  /** 1問1行・ID 順にして、問題を足したときの差分を読みやすくする */
  private static String render(List<?> items) {
    return items.stream()
        .map(MAPPER::writeValueAsString)
        .sorted()
        .collect(Collectors.joining(",\n", "[\n", "\n]\n"));
  }

  private static void check(String feature, String expected) throws IOException {
    Path file = OUT.resolve(feature + ".json");
    if (Boolean.getBoolean("export.write")) {
      Files.createDirectories(OUT);
      Files.writeString(file, expected, StandardCharsets.UTF_8);
      return;
    }
    assertThat(Files.exists(file) ? Files.readString(file, StandardCharsets.UTF_8) : "")
        .as(file + " が古くなっています。./scripts/export-questions.sh を実行してください")
        .isEqualTo(expected);
  }
}
