package com.example.backend.wordbook.dto;

import com.example.backend.wordbook.WordbookWord;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 単語帳の1語の表示用。利用者の色や訳を含む */
public record WordView(
    Long id,
    String word,
    String meaningJa,
    String exampleEn,
    String exampleAnswer,
    String exampleJa,
    String source,
    String color,
    String translationStatus,
    LocalDateTime createdAt,
    int timesAsked,
    int timesCorrect,
    /** 次の復習日。まだ一度も出していない語は null */
    LocalDate nextDueDate) {

  public static WordView of(WordbookWord w) {
    return new WordView(w.getId(), w.getWord(), w.getMeaningJa(), w.getExampleEn(), w.getExampleAnswer(),
        w.getExampleJa(), w.getSource().name(), w.getColor().name(), w.getTranslationStatus().name(),
        w.getCreatedAt(), w.getTimesAsked(), w.getTimesCorrect(), w.getNextDueDate());
  }
}
