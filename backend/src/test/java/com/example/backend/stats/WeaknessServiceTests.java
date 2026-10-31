package com.example.backend.stats;

import com.example.backend.stats.WeaknessService.TaggedAnswer;
import com.example.backend.stats.dto.WeaknessItem;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WeaknessServiceTests {

  @Test
  void aggregatesByTypeAndCategoryWeakestFirst() {
    List<WeaknessItem> items = WeaknessService.aggregate(List.of(
        new TaggedAnswer("grammar", "toeic-part5", "時制", true),
        new TaggedAnswer("grammar", "toeic-part5", "時制", true),
        new TaggedAnswer("grammar", "toeic-part5", "関係詞", false),
        new TaggedAnswer("grammar", "toeic-part5", "関係詞", true),
        new TaggedAnswer("reading", "toeic-part7", "推測", false)));

    assertThat(items).containsExactly(
        new WeaknessItem("grammar", "toeic-part5", "関係詞", 1, 2),
        new WeaknessItem("grammar", "toeic-part5", "時制", 2, 2),
        new WeaknessItem("reading", "toeic-part7", "推測", 0, 1));
  }
}
