package com.example.backend.wordbook;

import com.example.backend.wordbook.WordbookWord.TranslationStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WordbookRulesTests {

  @Test
  void blankSentenceReplacesTheFirstOccurrenceIgnoringCase() {
    assertThat(WordbookSentences.blank("The Team had to abandon the plan, and then abandon it.", "abandon"))
        .isEqualTo("The Team had to _____ the plan, and then abandon it.");
  }

  @Test
  void answerMustBeAWholeWordInTheSentence() {
    assertThat(WordbookSentences.contains("They ran home.", "ran")).isTrue();
    assertThat(WordbookSentences.contains("They ran home.", "rant")).isFalse();
    assertThat(WordbookSentences.contains("Their rant was long.", "ran")).isFalse();
  }

  @Test
  void translationIsDoneOnlyWhenNeededPartsArePresent() {
    // 例文が無い語(手動登録)は語の訳だけで出題できる
    assertThat(WordbookTranslationRules.statusOf("捨てる", null, null)).isEqualTo(TranslationStatus.DONE);
    // 例文があるのに例文の訳が無い語は、穴埋めに使えないので未完了
    assertThat(WordbookTranslationRules.statusOf("捨てる", "We abandon it.", null))
        .isEqualTo(TranslationStatus.PENDING);
    assertThat(WordbookTranslationRules.statusOf("捨てる", "We abandon it.", "私たちはそれを捨てる。"))
        .isEqualTo(TranslationStatus.DONE);
    assertThat(WordbookTranslationRules.statusOf(null, null, null)).isEqualTo(TranslationStatus.PENDING);
    assertThat(WordbookTranslationRules.statusOf(" ", null, null)).isEqualTo(TranslationStatus.PENDING);
  }
}
