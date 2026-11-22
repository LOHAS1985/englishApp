package com.example.backend.wordbook;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.wordbook.WordbookWord.Source;
import com.example.backend.wordbook.WordbookWord.TranslationStatus;
import com.example.backend.wordbook.dto.WordView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 例文の修正と、同梱語の削除の記録 */
class WordbookEditTests {

  private static final Long USER = 1L;
  private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 22, 9, 0);

  private final WordbookWordRepository repository = mock(WordbookWordRepository.class);
  private final DeletedBundledWordRepository deleted = mock(DeletedBundledWordRepository.class);
  private final CurrentUserProvider user = mock(CurrentUserProvider.class);
  private final WordbookService service = new WordbookService(repository, deleted,
      org.mockito.Mockito.mock(WordbookUnlockService.class), user);
  private WordbookWord word;

  @BeforeEach
  void wire() {
    when(user.getCurrentUserId()).thenReturn(USER);
    word = new WordbookWord(USER, "abandon", Source.BUNDLED, NOW);
    word.setExample("We abandon it.", "abandon");
    word.applyTranslation("捨てる", "私たちはそれを捨てる。", NOW);
    word.linkBundled("w0001", false);
    when(repository.findById(5L)).thenReturn(Optional.of(word));
    when(repository.save(any(WordbookWord.class))).thenAnswer(i -> i.getArgument(0));
  }

  @Test
  void exampleCanBeEditedAndMarksTheWordAsEditedByTheUser() {
    WordView view = service.setExample(5L, "  They had to abandon the plan.  ", "ABANDON", " 彼らは計画を断念した。 ");

    assertThat(view.exampleEn()).isEqualTo("They had to abandon the plan.");
    assertThat(view.exampleAnswer()).isEqualTo("abandon");
    assertThat(view.exampleJa()).isEqualTo("彼らは計画を断念した。");
    assertThat(word.isUserEdited()).isTrue();
    assertThat(word.getTranslationStatus()).isEqualTo(TranslationStatus.DONE);
  }

  @Test
  void blankExampleTranslationIsFetchedAgainTomorrow() {
    service.setExample(5L, "They abandoned the plan.", "abandoned", "");

    assertThat(word.getExampleJa()).isNull();
    // 訳が揃うまで穴埋めには出さない
    assertThat(word.getTranslationStatus()).isEqualTo(TranslationStatus.PENDING);
  }

  @Test
  void answerMustBeInTheSentenceAndBeAFormOfTheWord() {
    assertThatThrownBy(() -> service.setExample(5L, "They had a plan.", "abandon", "訳"))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("例文の中");
    assertThatThrownBy(() -> service.setExample(5L, "They had a plan.", "plan", "訳"))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("abandon");
    assertThatThrownBy(() -> service.setExample(5L, " ", "abandon", "訳"))
        .isInstanceOf(IllegalArgumentException.class);
    // 失敗したときは、元の例文のまま
    assertThat(word.getExampleEn()).isEqualTo("We abandon it.");
    assertThat(word.isUserEdited()).isFalse();
  }

  @Test
  void deletingABundledWordRemembersItSoUpdatesDoNotBringItBack() {
    service.delete(5L);

    verify(repository).delete(word);
    verify(deleted).save(any(DeletedBundledWord.class));
  }

  @Test
  void deletingYourOwnWordLeavesNoRecord() {
    WordbookWord mine = new WordbookWord(USER, "mine", Source.MANUAL, NOW);
    when(repository.findById(6L)).thenReturn(Optional.of(mine));

    service.delete(6L);

    verify(repository).delete(mine);
    org.mockito.Mockito.verifyNoInteractions(deleted);
  }

  @Test
  void listStillWorksWithEditedWords() {
    when(repository.findByUserIdOrderByIdAsc(USER)).thenReturn(List.of(word));
    assertThat(service.list(null, null)).hasSize(1);
  }
}
