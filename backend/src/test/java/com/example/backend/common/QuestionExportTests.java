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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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

    // 書き出すファイル(OUT からの相対パス → 内容)。読解・リスニングは形式(type)ごとに別ファイルにして、
    // 画面が開いた形式の分だけ読み込めるようにする
    Map<String, String> files = new TreeMap<>();
    files.put("grammar.json", render(grammar.all().stream().map(q -> choice(grammar, q)).toList()));
    files.put("vocab.json", render(vocab.all().stream().map(q -> choice(vocab, q)).toList()));
    Map<String, Map<String, String>> index = new LinkedHashMap<>();
    index.put("reading", splitByType("reading", reading, reading.all(), true, files));
    index.put("listening", splitByType("listening", listening, listening.all(), false, files));
    files.put("index.json", MAPPER.writeValueAsString(index) + "\n");

    check(files);
  }

  /** 形式ごとのファイルを files に足し、セット ID → 形式の対応(index.json 用)を返す */
  private static Map<String, String> splitByType(String feature, QuestionSetBank bank, List<QuestionSet> sets,
      boolean bundleTranscript, Map<String, String> files) {
    Map<String, List<SetExport>> byType = new TreeMap<>();
    Map<String, String> typeOf = new TreeMap<>();
    for (QuestionSet s : sets) {
      byType.computeIfAbsent(s.type(), t -> new java.util.ArrayList<>()).add(set(bank, s, bundleTranscript));
      typeOf.put(s.id(), s.type());
    }
    byType.forEach((type, items) -> files.put(feature + "/" + type + ".json", render(items)));
    return typeOf;
  }

  private static ChoiceExport choice(ChoiceQuestionBank bank, ChoiceQuestion q) {
    return new ChoiceExport(q.id(), q.sentence(), q.choices(), q.answer(), q.explanation(), q.translation(),
        bank.difficulty(q.id()));
  }

  /**
   * bundleTranscript: 台本と和訳を同梱するか。リスニングは同梱しない(公開サイトの配信ファイルから全文を読めないように)。
   * 解答後は ListeningController の reveal から、解答前の読み上げ用は script から取る。
   */
  private static SetExport set(QuestionSetBank bank, QuestionSet s, boolean bundleTranscript) {
    List<SetQuestionExport> questions = s.questions().stream()
        .map((SetQuestion q) -> new SetQuestionExport(q.question(), q.choices(), q.answer(), q.explanation()))
        .toList();
    return new SetExport(s.id(), s.type(), s.title(), s.passage(), s.situation(), s.graphic(),
        bundleTranscript ? s.script() : null, bundleTranscript ? s.translation() : null, questions,
        bank.difficulty(s.id()), s.theme());
  }

  /** 1問1行・ID 順にして、問題を足したときの差分を読みやすくする */
  private static String render(List<?> items) {
    return items.stream()
        .map(MAPPER::writeValueAsString)
        .sorted()
        .collect(Collectors.joining(",\n", "[\n", "\n]\n"));
  }

  private static void check(Map<String, String> files) throws IOException {
    if (Boolean.getBoolean("export.write")) {
      // 形式が減った・名前が変わったときに古いファイルが残らないよう、作り直す
      if (Files.exists(OUT)) {
        try (Stream<Path> old = Files.walk(OUT)) {
          for (Path p : old.sorted(java.util.Comparator.reverseOrder()).filter(p -> !p.equals(OUT)).toList()) {
            Files.delete(p);
          }
        }
      }
      for (Map.Entry<String, String> e : files.entrySet()) {
        Path file = OUT.resolve(e.getKey());
        Files.createDirectories(file.getParent());
        Files.writeString(file, e.getValue(), StandardCharsets.UTF_8);
      }
      return;
    }
    for (Map.Entry<String, String> e : files.entrySet()) {
      Path file = OUT.resolve(e.getKey());
      // Windows の autocrlf で CRLF になっていても同じ内容とみなす(書き出しは LF)
      assertThat(Files.exists(file) ? Files.readString(file, StandardCharsets.UTF_8).replace("\r\n", "\n") : "")
          .as(file + " が古くなっています。./scripts/export-questions.sh を実行してください")
          .isEqualTo(e.getValue());
    }
    // 書き出し対象に無い古いファイル(消えた形式・分割前の listening.json など)が残っていないか
    if (Files.exists(OUT)) {
      try (Stream<Path> found = Files.walk(OUT)) {
        List<String> existing = found.filter(Files::isRegularFile)
            .map(p -> OUT.relativize(p).toString().replace('\\', '/')).toList();
        assertThat(existing).as("書き出し対象に無いファイルがあります。./scripts/export-questions.sh で作り直してください")
            .containsExactlyInAnyOrderElementsOf(files.keySet());
      }
    }
  }
}
