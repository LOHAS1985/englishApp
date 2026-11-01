package com.example.backend.common;

import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.reading.ReadingQuestionBank;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 同じ話題を言い換えただけのセットが紛れ込んでいないか。一巡するまでに同じ内容を2回解くことになるため。
 * 題名の完全一致だけでは「Coral reef restoration」と「Restoring coral reefs」のような言い換えを見逃すので、
 * 本文(台本)に出てくる語の重なり(Jaccard 係数)でも検査する。
 */
class DuplicateSetTests {

  private static final JsonMapper MAPPER = JsonMapper.builder().build();
  private static final Pattern WORD = Pattern.compile("[a-z']+");
  /** 英検 Part 2 は話題そのものが問われるので厳しめ。以前の重複は 0.5 前後だった */
  private static final double EIKEN_PART2_LIMIT = 0.4;
  /** その他の形式はほぼ丸写しだけを検出する(定型の言い回しが多く、別の場面でも 0.3〜0.5 になる) */
  private static final double GENERAL_LIMIT = 0.55;

  @Test
  void eikenPart2TopicsAreNotRepeated() {
    List<QuestionSet> part2 = new ListeningQuestionBank(MAPPER).all().stream()
        .filter(s -> s.type().equals("eiken-part2")).toList();
    // ハイフン・大文字小文字・アポストロフィの違いだけの題名も同じとみなす
    assertThat(part2).extracting(s -> s.title().toLowerCase(Locale.ROOT).replaceAll("[^a-z]", ""))
        .as("eiken-part2 titles").doesNotHaveDuplicates();
    assertNoSimilarPairs(part2, EIKEN_PART2_LIMIT);
  }

  @Test
  void noSetIsANearCopyOfAnother() {
    List<QuestionSet> all = new ArrayList<>(new ListeningQuestionBank(MAPPER).all());
    all.addAll(new ReadingQuestionBank(MAPPER).all());
    for (String type : all.stream().map(QuestionSet::type).distinct().toList()) {
      assertNoSimilarPairs(all.stream().filter(s -> s.type().equals(type)).toList(), GENERAL_LIMIT);
    }
  }

  private static void assertNoSimilarPairs(List<QuestionSet> sets, double limit) {
    List<Set<String>> words = sets.stream().map(DuplicateSetTests::words).toList();
    for (int i = 0; i < sets.size(); i++) {
      for (int j = i + 1; j < sets.size(); j++) {
        assertThat(jaccard(words.get(i), words.get(j)))
            .as(sets.get(i).id() + " " + sets.get(i).title() + " / " + sets.get(j).id() + " " + sets.get(j).title())
            .isLessThan(limit);
      }
    }
  }

  private static Set<String> words(QuestionSet s) {
    StringBuilder text = new StringBuilder(s.script() != null ? s.script() : s.passage() != null ? s.passage() : "");
    if (text.isEmpty()) {
      // TOEIC Part 2 は台本を設問から組み立てるので、設問と選択肢で比べる
      s.questions().forEach(q -> text.append(' ').append(q.question()).append(' ').append(String.join(" ", q.choices())));
    }
    Set<String> result = new HashSet<>();
    Matcher m = WORD.matcher(text.toString().toLowerCase(Locale.ROOT));
    while (m.find()) {
      result.add(m.group());
    }
    return result;
  }

  static double jaccard(Set<String> a, Set<String> b) {
    Set<String> union = new HashSet<>(a);
    union.addAll(b);
    if (union.isEmpty()) {
      return 0;
    }
    Set<String> common = new HashSet<>(a);
    common.retainAll(b);
    return (double) common.size() / union.size();
  }
}
