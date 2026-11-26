package com.example.backend.wordbook;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/** 同梱語は入れたらすぐ出す(以前は1日20語ずつ解放していた。2026-11-26 に変更) */
@SpringBootTest
class WordbookUnlockTests {

  @Autowired
  private WordbookService wordService;
  @Autowired
  private WordbookWordRepository repository;
  @Autowired
  private WordbookUnlockService unlocks;
  @Autowired
  private BundledWordBank bank;

  @Test
  void everyBundledWordIsOpenFromTheStart() {
    wordService.list(null, null);
    assertThat(repository.findAll()).allMatch(WordbookWord::isUnlocked);
    assertThat(wordService.list(null, null)).anyMatch(v -> v.word().equals("abandon"))
        .anyMatch(v -> v.word().equals("notice"));
  }

  @Test
  void wordsLeftLockedByTheOldVersionAreReleasedAtOnce() {
    WordbookWord word = repository.findAll().stream().filter(w -> w.getBundledId() != null).findFirst().orElseThrow();
    word.setUnlocked(false);
    repository.save(word);

    unlocks.releaseIfDue();

    assertThat(repository.findById(word.getId()).orElseThrow().isUnlocked()).isTrue();
  }

  @Test
  void bundledWordsStartUncoloredAndShowTheirLevel() {
    // 易しい語(水準1)でも、最初は無色(本当に知っているかを一度は確かめるため)
    assertThat(wordService.list(null, null)).filteredOn(v -> v.word().equals("agenda")).singleElement()
        .satisfies(v -> {
          assertThat(v.level()).isEqualTo(1);
          assertThat(v.color()).isEqualTo("NONE");
        });
    assertThat(bank.all()).allMatch(w -> w.level() != null && w.level() >= 1 && w.level() <= 4);
  }
}
