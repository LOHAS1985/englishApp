package com.example.backend.wordbook;

import com.example.backend.wordbook.WordbookWord.TranslationStatus;

/** 日本語訳が出題に必要な分だけ揃っているかの判定 */
final class WordbookTranslationRules {

  private WordbookTranslationRules() {
  }

  /**
   * 日本語訳が揃っていれば DONE。例文が無い語(手動登録など)は語の訳だけで足りる。
   * 例文があるのに例文の訳が無い語は、穴埋めに使えないので DONE にしない。
   */
  static TranslationStatus statusOf(String meaningJa, String exampleEn, String exampleJa) {
    boolean hasMeaning = meaningJa != null && !meaningJa.isBlank();
    boolean needsExampleJa = exampleEn != null && !exampleEn.isBlank();
    boolean hasExampleJa = exampleJa != null && !exampleJa.isBlank();
    return hasMeaning && (!needsExampleJa || hasExampleJa) ? TranslationStatus.DONE : TranslationStatus.PENDING;
  }
}
