package com.example.backend.common;

import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.reading.ReadingQuestionBank;
import com.example.backend.writing.WritingPromptBank;
import com.example.backend.writing.WritingPromptBank.WritingPrompt;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 英検準1級の話題(社会・環境・科学・医療・教育・ビジネス・文化)が偏っていないか。
 * 長文・説明文(大問2・3・リスニング Part 2)とライティングのそれぞれで、どの話題も 7〜30% に収める。
 */
class ThemeBalanceTests {

  private static final JsonMapper MAPPER = JsonMapper.builder().build();
  private static final double MIN_SHARE = 0.07;
  private static final double MAX_SHARE = 0.30;

  @Test
  void eikenPassagesCoverAllThemesEvenly() {
    List<String> themes = new ArrayList<>();
    List<QuestionSet> sets = new ArrayList<>(new ReadingQuestionBank(MAPPER).all());
    sets.addAll(new ListeningQuestionBank(MAPPER).all());
    for (QuestionSet s : sets) {
      if (Themes.REQUIRED_TYPES.contains(s.type())) {
        assertThat(s.theme()).as(s.id() + " theme").isIn(Themes.ALL);
        themes.add(s.theme());
      } else if (s.theme() != null) {
        assertThat(s.theme()).as(s.id() + " theme").isIn(Themes.ALL);
      }
    }
    assertBalanced("英検 長文・説明文", themes);
  }

  @Test
  void writingPromptsCoverAllThemesEvenly() {
    List<String> themes = new ArrayList<>();
    for (WritingPrompt p : new WritingPromptBank(MAPPER).all()) {
      assertThat(p.theme()).as(p.id() + " theme").isIn(Themes.ALL);
      themes.add(p.theme());
    }
    assertBalanced("ライティング", themes);
  }

  private static void assertBalanced(String name, List<String> themes) {
    Map<String, Integer> counts = new TreeMap<>();
    Themes.ALL.forEach(t -> counts.put(t, 0));
    themes.forEach(t -> counts.merge(t, 1, Integer::sum));
    System.out.println(name + ": " + counts);
    counts.forEach((theme, count) -> assertThat((double) count / themes.size()).as(name + " " + theme)
        .isBetween(MIN_SHARE, MAX_SHARE));
  }
}
