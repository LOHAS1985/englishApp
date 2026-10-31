package com.example.backend.common;

import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.common.QuestionSetBank.SetQuestion;
import com.example.backend.grammar.GrammarQuestionBank;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.reading.ReadingQuestionBank;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.assertThat;

class QuestionTagsTests {

  private static final JsonMapper MAPPER = JsonMapper.builder().build();

  @Test
  void groupsGrammarPointsIntoCategories() {
    assertThat(QuestionTags.grammarCategory("関係代名詞(前置詞+which)")).isEqualTo("関係詞");
    assertThat(QuestionTags.grammarCategory("仮定法(倒置)")).isEqualTo("仮定法");
    assertThat(QuestionTags.grammarCategory("倒置(Not until)")).isEqualTo("倒置");
    assertThat(QuestionTags.grammarCategory("品詞(副詞・時)")).isEqualTo("品詞・語形");
    assertThat(QuestionTags.grammarCategory("時制(未来・時の副詞節)")).isEqualTo("時制");
    assertThat(QuestionTags.grammarCategory("前置詞(群前置詞)")).isEqualTo("前置詞");
    assertThat(QuestionTags.grammarCategory("接続副詞")).isEqualTo("接続詞");
    assertThat(QuestionTags.grammarCategory("動詞の形(have + O + 過去分詞)")).isEqualTo("動詞の形・語法");
    assertThat(QuestionTags.grammarCategory("分詞構文(Given)")).isEqualTo("準動詞(不定詞・動名詞・分詞)");
    assertThat(QuestionTags.grammarCategory("語彙(前置詞句)")).isEqualTo("語彙・コロケーション");
  }

  /** 問題集の point が分類規則から漏れていないか(新しい書き方の point が増えたら規則を足す) */
  @Test
  void almostAllGrammarQuestionsHaveACategory() {
    List<ChoiceQuestion> all = new GrammarQuestionBank(MAPPER).all();
    Map<String, Integer> counts = new TreeMap<>();
    all.forEach(q -> counts.merge(QuestionTags.grammarCategory(q.point()), 1, Integer::sum));
    System.out.println("grammar categories: " + counts);
    List<String> unclassified = all.stream().map(ChoiceQuestion::point)
        .filter(p -> QuestionTags.OTHER.equals(QuestionTags.grammarCategory(p))).toList();
    assertThat(unclassified).as("分類できない point").hasSizeLessThanOrEqualTo(all.size() / 50);
  }

  @Test
  void classifiesSetQuestionsByWording() {
    assertThat(QuestionTags.setQuestionType("toeic-part7", "What is NOT mentioned as part of the festival?", List.of()))
        .isEqualTo("NOT問題");
    assertThat(QuestionTags.setQuestionType("toeic-part7", "What is suggested about Ellen Reed?", List.of()))
        .isEqualTo("推測");
    assertThat(QuestionTags.setQuestionType("toeic-part7",
        "At 9:18 A.M., what does Mr. Ito mean when he writes, \"Their meeting is over\"?", List.of()))
        .isEqualTo("発言の意図");
    assertThat(QuestionTags.setQuestionType("toeic-part3", "Why does the man say, \"Monday's too late\"?", List.of()))
        .isEqualTo("発言の意図");
    assertThat(QuestionTags.setQuestionType("toeic-part7", "What is the purpose of the memo?", List.of()))
        .isEqualTo("主旨・目的");
    assertThat(QuestionTags.setQuestionType("toeic-part7", "What is indicated about the project?", List.of()))
        .isEqualTo("内容一致");
    assertThat(QuestionTags.setQuestionType("toeic-part4", "Look at the graphic. Which gate will be used?", List.of()))
        .isEqualTo("図表");
    assertThat(QuestionTags.setQuestionType("toeic-part3", "What will the man most likely do next?", List.of()))
        .isEqualTo("推測");
    assertThat(QuestionTags.setQuestionType("toeic-part7", "Where is the assembly point?", List.of()))
        .isEqualTo("詳細");
    assertThat(QuestionTags.setQuestionType("toeic-part6", "[2]",
        List.of("distributing", "distributed", "distribution", "distributor"))).isEqualTo("空所(語形・文法)");
    assertThat(QuestionTags.setQuestionType("toeic-part6", "[1]", List.of("by", "until", "within", "since")))
        .isEqualTo("空所(語彙・接続)");
    assertThat(QuestionTags.setQuestionType("toeic-part6", "[3]", List.of("The new office has a larger kitchen.",
        "The team will then reinstall them.", "Employees may leave early.", "The elevator will be repaired.")))
        .isEqualTo("文挿入");
  }

  @Test
  void classifiesPart2ByQuestionForm() {
    assertThat(QuestionTags.part2Form("where can i find extra toner cartridges?")).isEqualTo("疑問詞の疑問文");
    assertThat(QuestionTags.part2Form("did you remember to lock the storage room?")).isEqualTo("Yes/No 疑問文");
    assertThat(QuestionTags.part2Form("haven't you finished the inventory yet?")).isEqualTo("否定・付加疑問文");
    assertThat(QuestionTags.part2Form("you've been to the tokyo office, haven't you?")).isEqualTo("否定・付加疑問文");
    assertThat(QuestionTags.part2Form("should we hire a caterer or prepare the food ourselves?"))
        .isEqualTo("選択疑問文");
    assertThat(QuestionTags.part2Form("let's take a short break before we continue.")).isEqualTo("依頼・提案");
    assertThat(QuestionTags.part2Form("i can't find the agenda for this afternoon's meeting.")).isEqualTo("平叙文");
  }

  /** 実際の問題集で、設問タイプの分布を確認する(詳細ばかりになっていれば規則の漏れ) */
  @Test
  void setQuestionTypesAreSpreadAcrossTheBanks() {
    for (QuestionSetBank bank : List.of(new ReadingQuestionBank(MAPPER), new ListeningQuestionBank(MAPPER))) {
      Map<String, Map<String, Integer>> byType = new TreeMap<>();
      for (QuestionSet s : bank.all()) {
        for (SetQuestion q : s.questions()) {
          byType.computeIfAbsent(s.type(), k -> new TreeMap<>())
              .merge(QuestionTags.setQuestionType(s.type(), q.question(), q.choices()), 1, Integer::sum);
        }
      }
      byType.forEach((type, counts) -> {
        System.out.println(type + ": " + counts);
        assertThat(counts).as(type).hasSizeGreaterThanOrEqualTo(type.equals("eiken-cloze") || type.equals("eiken-part3") ? 1 : 2);
      });
    }
  }
}
