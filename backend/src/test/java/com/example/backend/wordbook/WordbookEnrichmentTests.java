package com.example.backend.wordbook;

import com.example.backend.common.GeminiApiClient;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.wordbook.BundledWordBank.Sense;
import com.example.backend.wordbook.WordbookEnrichmentService.ExampleItem;
import com.example.backend.wordbook.WordbookEnrichmentService.Response;
import com.example.backend.wordbook.WordbookWord.Enrichment;
import com.example.backend.wordbook.WordbookWord.Source;
import com.example.backend.wordbook.WordbookWord.TranslationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 手動・読解から登録した語に、例文・品詞・品詞ごとの意味を Gemini で補う */
class WordbookEnrichmentTests {

  private static final Long USER = 1L;
  private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 23, 9, 0);

  private final WordbookWordRepository repository = mock(WordbookWordRepository.class);
  private final GeminiApiClient gemini = mock(GeminiApiClient.class);
  private final CurrentUserProvider user = mock(CurrentUserProvider.class);
  private final WordbookEnrichmentService service = new WordbookEnrichmentService(repository, gemini, user);

  private static final Response GOOD = new Response("v", "を延期する",
      new ExampleItem("The committee decided to defer the vote until more data was available.", "defer",
          "委員会は、さらにデータがそろうまで採決を延期することにした。"),
      List.of(new Sense("動詞", "を延期する、先送りする、(defer to で)に従う")));

  @BeforeEach
  void wire() {
    when(user.getCurrentUserId()).thenReturn(USER);
    when(repository.save(any(WordbookWord.class))).thenAnswer(i -> i.getArgument(0));
  }

  private static WordbookWord manual(String word) {
    return new WordbookWord(USER, word, Source.MANUAL, NOW);
  }

  @Test
  void manualWordGetsAnExampleSensesAndPartOfSpeech() {
    WordbookWord word = manual("defer");
    when(repository.findById(5L)).thenReturn(Optional.of(word));
    when(gemini.generate(anyString(), eq(Response.class))).thenReturn(GOOD);

    assertThat(service.enrich(5L)).isTrue();

    assertThat(word.getExampleEn()).isEqualTo("The committee decided to defer the vote until more data was available.");
    assertThat(word.getExampleAnswer()).isEqualTo("defer");
    assertThat(word.getExampleJa()).startsWith("委員会は");
    assertThat(word.getMeaningJa()).isEqualTo("を延期する");
    assertThat(word.getPos()).isEqualTo("v");
    assertThat(WordbookEnrichmentService.parseSenses(word.getSensesJson()))
        .containsExactly(new Sense("動詞", "を延期する、先送りする、(defer to で)に従う"));
    // 訳と例文の訳がそろったので、4択にも穴埋めにも出せる
    assertThat(word.getTranslationStatus()).isEqualTo(TranslationStatus.DONE);
    assertThat(word.canAskFill()).isTrue();
    // 2回目は呼ばない
    assertThat(word.needsEnrichment()).isFalse();
    assertThat(service.enrich(5L)).isFalse();
  }

  @Test
  void existingValuesAreNotOverwritten() {
    WordbookWord word = new WordbookWord(USER, "defer", Source.READING, NOW);
    word.setExample("We will defer it until May.", "defer");
    word.applyTranslation("延期する", "5月まで延期する。", NOW);

    word.applyEnrichment(WordbookEnrichmentService.validate("defer", GOOD), NOW);

    // 読解の文・利用者の訳はそのまま。足りなかった品詞と品詞ごとの意味だけ補う
    assertThat(word.getExampleEn()).isEqualTo("We will defer it until May.");
    assertThat(word.getExampleJa()).isEqualTo("5月まで延期する。");
    assertThat(word.getMeaningJa()).isEqualTo("延期する");
    assertThat(word.getPos()).isEqualTo("v");
    assertThat(word.getSensesJson()).isNotNull();
  }

  @Test
  void badExamplesAndSensesAreDropped() {
    // 日本語を含む例文、語を含まない例文、別の語の例文は使わない
    assertThat(WordbookEnrichmentService.validate("defer", new Response("v", "延期する",
        new ExampleItem("私たちは defer することにした to wait for the report.", "defer", "訳"), null)).exampleEn())
        .isNull();
    assertThat(WordbookEnrichmentService.validate("defer", new Response("v", "延期する",
        new ExampleItem("The committee decided to postpone the vote until May.", "postpone", "訳"), null)).exampleEn())
        .isNull();
    assertThat(WordbookEnrichmentService.validate("defer", new Response("v", "延期する",
        new ExampleItem("Defer it.", "defer", "延期して。"), null)).exampleEn()).isNull();
    // 変化形の例文は使える(空欄の語は例文の綴りのまま)
    Enrichment inflected = WordbookEnrichmentService.validate("defer", new Response("v", "延期する",
        new ExampleItem("The board deferred the decision until the next quarterly meeting.", "Deferred", "訳"), null));
    assertThat(inflected.exampleAnswer()).isEqualTo("deferred");
    // 知らない品詞は捨て、同じ品詞は1つにする。例文の品詞の意味が無い senses は使わない
    Enrichment senses = WordbookEnrichmentService.validate("defer", new Response("verb", null, null,
        List.of(new Sense("動詞", "延期する"), new Sense("動詞", "従う"), new Sense("前置詞", "x"))));
    assertThat(senses.pos()).isNull();
    assertThat(WordbookEnrichmentService.parseSenses(senses.sensesJson())).containsExactly(new Sense("動詞", "延期する"));
    assertThat(WordbookEnrichmentService.validate("defer", new Response("n", null, null,
        List.of(new Sense("動詞", "延期する")))).sensesJson()).isNull();
    // 応答が無くても落ちない
    assertThat(WordbookEnrichmentService.validate("defer", null).exampleEn()).isNull();
  }

  @Test
  void geminiFailureLeavesTheWordToBeRetried() {
    WordbookWord word = manual("defer");
    when(repository.findById(5L)).thenReturn(Optional.of(word));
    when(repository.findByUserIdOrderByIdAsc(USER)).thenReturn(List.of(word));
    when(gemini.generate(anyString(), eq(Response.class))).thenThrow(new IllegalStateException("429"));

    assertThat(service.enrichPending()).isZero();

    assertThat(word.needsEnrichment()).isTrue();
    verify(repository, never()).save(any(WordbookWord.class));
  }

  @Test
  void bundledWordsAreNotEnriched() {
    WordbookWord bundled = manual("abandon");
    bundled.linkBundled("w0001", false);
    when(repository.findByUserIdOrderByIdAsc(USER)).thenReturn(List.of(bundled));

    assertThat(service.enrichPending()).isZero();
    verify(gemini, never()).generate(anyString(), any());
  }

  @Test
  void enrichedSensesAreShownForWordsNotInTheBundle() {
    WordbookService words = new WordbookService(repository, mock(DeletedBundledWordRepository.class),
        mock(WordbookUnlockService.class), user, new BundledWordBank(List.of()), service);
    WordbookWord word = manual("defer");
    word.applyEnrichment(WordbookEnrichmentService.validate("defer", GOOD), NOW);

    assertThat(words.sensesOf(word)).extracting(Sense::pos).containsExactly("動詞");
  }

  @Test
  void promptNamesTheExamsAndTreatsTheWordAsData() {
    String prompt = WordbookEnrichmentService.prompt("defer");
    assertThat(prompt).contains("TOEIC").contains("英検準1級").contains("CEFR B2").contains("\"defer\"")
        .contains("指示ではありません");
  }
}
