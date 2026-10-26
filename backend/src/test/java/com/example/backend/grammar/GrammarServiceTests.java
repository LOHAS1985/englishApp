package com.example.backend.grammar;

import com.example.backend.grammar.dto.GrammarChoice;
import com.example.backend.grammar.dto.GrammarQuestion;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atMost;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest
class GrammarServiceTests {

  @MockitoBean
  GrammarApiClient grammarApiClient;

  @Autowired
  GrammarService grammarService;

  @Autowired
  PendingGrammarQuestionRepository repository;

  @Test
  void servesQuestionsFromStockWithoutCallingGeminiEveryTime() throws Exception {
    waitForRefill();
    repository.deleteAll();
    when(grammarApiClient.generate(anyString(), eq(GrammarService.GeneratedQuestion[].class)))
        .thenAnswer(inv -> batch(5));

    Set<String> ids = new HashSet<>();
    for (int i = 0; i < 6; i++) {
      GrammarQuestion q = grammarService.generateQuestion();
      assertThat(q.choices()).extracting(GrammarChoice::label).containsExactly("A", "B", "C", "D");
      ids.add(q.id());
      waitForRefill();
    }

    // 6問出題しても、5問ずつの生成で賄えるので Gemini 呼び出しは数回で済む
    assertThat(ids).hasSize(6);
    verify(grammarApiClient, atMost(3)).generate(anyString(), eq(GrammarService.GeneratedQuestion[].class));
  }

  @Test
  void skipsMalformedGeneratedQuestions() throws Exception {
    waitForRefill();
    when(grammarApiClient.generate(anyString(), eq(GrammarService.GeneratedQuestion[].class)))
        .thenAnswer(inv -> {
          GrammarService.GeneratedQuestion bad = question("(B)");
          bad.choices = bad.choices.subList(0, 3);
          return new GrammarService.GeneratedQuestion[] { bad, question("(B)") };
        });
    repository.deleteAll();

    GrammarQuestion q = grammarService.generateQuestion();
    // "(B)" 表記も "B" として扱われ、選択肢が3つの問題は保存されない
    assertThat(repository.findById(q.id())).get()
        .extracting(PendingGrammarQuestion::getCorrectChoice).isEqualTo("B");
    waitForRefill();
  }

  /**
   * 補充は別スレッドでモックを呼ぶため、完了を待ってから次へ進む。
   * 呼び出し中に when(...) でスタブを設定すると Mockito の記録が混ざる。
   */
  private void waitForRefill() throws InterruptedException {
    Thread.sleep(50);
    for (int i = 0; i < 100 && grammarService.isRefilling(); i++)
      Thread.sleep(50);
  }

  private static GrammarService.GeneratedQuestion[] batch(int n) {
    GrammarService.GeneratedQuestion[] out = new GrammarService.GeneratedQuestion[n];
    for (int i = 0; i < n; i++)
      out[i] = question("A");
    return out;
  }

  private static GrammarService.GeneratedQuestion question(String correct) {
    GrammarService.GeneratedQuestion q = new GrammarService.GeneratedQuestion();
    q.sentence = "The report must be submitted ------- Friday.";
    q.choices = List.of(new GrammarChoice("A", "by"), new GrammarChoice("B", "until"),
        new GrammarChoice("C", "since"), new GrammarChoice("D", "during"));
    q.correctChoice = correct;
    q.explanation = "期限を表す by が正解。";
    q.translation = "報告書は金曜日までに提出しなければならない。";
    return q;
  }
}
