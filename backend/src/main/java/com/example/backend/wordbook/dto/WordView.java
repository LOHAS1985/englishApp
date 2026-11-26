package com.example.backend.wordbook.dto;

import com.example.backend.wordbook.BundledWordBank.Sense;
import com.example.backend.wordbook.WordbookWord;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
    LocalDate nextDueDate,
    /** 品詞ごとの主な意味(同梱語にある語だけ。無ければ空) */
    List<Sense> senses,
    /** 水準(同梱語だけ。1=600点・2=730点・3=860点・4=930点/英検準1級。手動・読解から登録した語は null) */
    Integer level) {

  public static WordView of(WordbookWord w, List<Sense> senses) {
    return new WordView(w.getId(), w.getWord(), w.getMeaningJa(), w.getExampleEn(), w.getExampleAnswer(),
        w.getExampleJa(), w.getSource().name(), w.getColor().name(), w.getTranslationStatus().name(),
        w.getCreatedAt(), w.getTimesAsked(), w.getTimesCorrect(), w.getNextDueDate(), senses,
        w.getBundledId() == null ? null : w.getLevel());
  }
}
