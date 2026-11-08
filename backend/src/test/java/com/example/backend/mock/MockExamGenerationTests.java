package com.example.backend.mock;

import com.example.backend.grammar.GrammarQuestionBank;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.mock.dto.MockExamView;
import com.example.backend.mock.dto.MockExamView.Item;
import com.example.backend.mock.dto.MockExamView.Section;
import com.example.backend.reading.ReadingQuestionBank;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** 実際の問題集から模試を組むときの区切りごとの問題数と、音声の形式の扱いを確かめる */
class MockExamGenerationTests {

  private static final JsonMapper MAPPER = JsonMapper.builder().build();

  private final MockExamService service = new MockExamService(
      new ListeningQuestionBank(MAPPER), new ReadingQuestionBank(MAPPER), new GrammarQuestionBank(MAPPER),
      null, null, null, null, null);

  private MockExamView generated() {
    return service.generate(new Random(20261108));
  }

  private static int questionsIn(List<Item> items) {
    return items.stream().mapToInt(i -> i.questions().size()).sum();
  }

  @Test
  void sectionsKeepTheOfficialTimeLimits() {
    MockExamView view = generated();
    assertThat(view.sections()).extracting(Section::skill).containsExactly("listening", "reading");
    assertThat(view.sections()).extracting(Section::minutes).containsExactly(45, 75);
  }

  @Test
  void listeningHasPart2To4WithTheRightQuestionCounts() {
    List<Item> listening = generated().sections().get(0).items();
    assertThat(questionsIn(listening)).isEqualTo(94);
    assertThat(listening.stream().filter(i -> i.type().equals("toeic-part2")).mapToInt(i -> i.questions().size()).sum())
        .isEqualTo(25);
    assertThat(listening.stream().filter(i -> i.type().equals("toeic-part3")).mapToInt(i -> i.questions().size()).sum())
        .isEqualTo(39);
    assertThat(listening.stream().filter(i -> i.type().equals("toeic-part4")).mapToInt(i -> i.questions().size()).sum())
        .isEqualTo(30);
  }

  @Test
  void readingHasPart5To7WithTheRightQuestionCounts() {
    List<Item> reading = generated().sections().get(1).items();
    assertThat(questionsIn(reading)).isEqualTo(100);
    assertThat(reading.stream().filter(i -> i.type().equals("toeic-part5")).count()).isEqualTo(30);
    assertThat(reading.stream().filter(i -> i.type().equals("toeic-part6")).mapToInt(i -> i.questions().size()).sum())
        .isEqualTo(16);
    assertThat(reading.stream().filter(i -> i.type().equals("toeic-part7")).mapToInt(i -> i.questions().size()).sum())
        .isEqualTo(54);
  }

  @Test
  void listeningHidesTitlesAndPart2ChoicesAreAudioOnly() {
    List<Item> listening = generated().sections().get(0).items();
    assertThat(listening).allSatisfy(i -> {
      assertThat(i.title()).isNull();
      assertThat(i.passage()).isNull();
    });
    List<Item> part2 = listening.stream().filter(i -> i.type().equals("toeic-part2")).toList();
    assertThat(part2).allSatisfy(i -> i.questions().forEach(q -> {
      assertThat(q.question()).isEmpty();
      assertThat(q.choices()).allMatch(String::isEmpty);
    }));
  }

  @Test
  void eachItemAppearsOnlyOnce() {
    MockExamView view = generated();
    Set<String> ids = view.sections().stream()
        .flatMap(s -> s.items().stream())
        .map(Item::id)
        .collect(Collectors.toSet());
    int total = view.sections().stream().mapToInt(s -> s.items().size()).sum();
    assertThat(ids).hasSize(total);
  }
}
