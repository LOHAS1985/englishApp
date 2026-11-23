package com.example.backend.wordbook;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.wordbook.WordbookWord.Source;
import com.example.backend.wordbook.WordbookWord.TranslationStatus;
import com.example.backend.wordbook.dto.AddWordResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 穴埋めの問題文(例文)に日本語が出ないこと。文法・語彙の解説(日本語)から語を選んで登録すると、
 * 解説の文がそのまま例文になり、穴埋めの問題文に日本語が出ていた。
 */
class WordbookJapaneseExampleTests {

  private static final Long USER = 1L;
  private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 23, 9, 0);

  private final WordbookWordRepository repository = mock(WordbookWordRepository.class);
  private final CurrentUserProvider user = mock(CurrentUserProvider.class);
  private final WordbookService service = new WordbookService(repository, mock(DeletedBundledWordRepository.class),
      mock(WordbookUnlockService.class), user, new BundledWordBank(List.of()));
  private final List<WordbookWord> stored = new ArrayList<>();

  @BeforeEach
  void wire() {
    when(user.getCurrentUserId()).thenReturn(USER);
    when(repository.findByUserIdOrderByIdAsc(USER)).thenReturn(stored);
    when(repository.save(any(WordbookWord.class))).thenAnswer(i -> i.getArgument(0));
  }

  @Test
  void englishPartIsTakenFromAMixedSentence() {
    assertThat(WordbookSentences.englishPart(
        "例文:The board decided to defer the vote until May.(延期する)", "defer"))
        .isEqualTo("The board decided to defer the vote until May.");
    // 英語の部分が短い(語句だけ)なら使わない
    assertThat(WordbookSentences.englishPart("defer は「延期する」という意味。", "defer")).isNull();
    assertThat(WordbookSentences.englishPart("defer the vote は「投票を延期する」。", "defer")).isNull();
    // 日本語を含まない文はそのまま
    assertThat(WordbookSentences.englishPart(" We defer it to May. ", "defer")).isEqualTo("We defer it to May.");
    assertThat(WordbookSentences.containsJapanese("We defer it.")).isFalse();
    assertThat(WordbookSentences.containsJapanese("We defer it。")).isTrue();
  }

  @Test
  void wordPickedFromAJapaneseExplanationIsAddedWithoutTheJapaneseSentence() {
    AddWordResponse response = service.add("defer", "defer は「延期する」という意味。", "defer");

    assertThat(response.added()).isTrue();
    assertThat(response.word().exampleEn()).isNull();
    // 例文が無いので穴埋めには出ず、4択にだけ出る
    assertThat(response.word().source()).isEqualTo("MANUAL");
  }

  @Test
  void englishPartOfAnExplanationIsKeptAsTheExample() {
    AddWordResponse response = service.add("defer",
        "例:The board decided to defer the vote until May.", "defer");

    assertThat(response.word().exampleEn()).isEqualTo("The board decided to defer the vote until May.");
    assertThat(response.word().exampleAnswer()).isEqualTo("defer");
  }

  @Test
  void editedExampleMustBeEnglish() {
    WordbookWord word = new WordbookWord(USER, "defer", Source.MANUAL, NOW);
    when(repository.findById(7L)).thenReturn(java.util.Optional.of(word));

    assertThatThrownBy(() -> service.setExample(7L, "私たちは defer した。", "defer", "訳"))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("英語");
  }

  @Test
  void storedJapaneseExamplesAreRepairedAtStartup() {
    WordbookWord onlyJapanese = word("defer", "defer は「延期する」という意味。", "defer");
    WordbookWord mixed = word("curb", "例:The city plans to curb traffic downtown.(抑制する)", "curb");
    WordbookWord english = word("abandon", "They had to abandon the plan.", "abandon");
    stored.addAll(List.of(onlyJapanese, mixed, english));

    int repaired = new WordbookExampleRepair(repository, user).run();

    assertThat(repaired).isEqualTo(2);
    // 英語の部分が無い語は例文を外す(訳が揃っているので4択には出る)
    assertThat(onlyJapanese.getExampleEn()).isNull();
    assertThat(onlyJapanese.getExampleAnswer()).isNull();
    assertThat(onlyJapanese.getTranslationStatus()).isEqualTo(TranslationStatus.DONE);
    // 英語の部分がある語はそれだけを残し、例文の訳は取り直す
    assertThat(mixed.getExampleEn()).isEqualTo("The city plans to curb traffic downtown.");
    assertThat(mixed.getExampleJa()).isNull();
    assertThat(mixed.getTranslationStatus()).isEqualTo(TranslationStatus.PENDING);
    // 英文の例文は触らない
    assertThat(english.getExampleEn()).isEqualTo("They had to abandon the plan.");
    assertThat(english.getExampleJa()).isEqualTo("訳");
    // 2回目は何もしない
    assertThat(new WordbookExampleRepair(repository, user).run()).isZero();
  }

  private static WordbookWord word(String headword, String exampleEn, String answer) {
    WordbookWord w = new WordbookWord(USER, headword, Source.READING, NOW);
    w.setExample(exampleEn, answer);
    w.applyTranslation("意味", "訳", NOW);
    return w;
  }
}
