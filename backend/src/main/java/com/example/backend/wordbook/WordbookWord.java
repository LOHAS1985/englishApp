package com.example.backend.wordbook;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** 単語帳の1語。同梱語・読解から登録した語・手動で登録した語のいずれも同じ表に持つ */
@Entity
@Table(name = "wordbook_words")
public class WordbookWord {

  /** 登録の経路。同梱語は問題集から、読解の語は本文の文を例文にして登録する */
  public enum Source { BUNDLED, READING, MANUAL }

  /** 日本語訳(と例文の訳)が揃っているか。DONE になるまで出題しない */
  public enum TranslationStatus { PENDING, DONE, FAILED }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  /** 小文字の見出し語(利用者ごとに一意) */
  @Column(nullable = false, length = 60)
  private String word;

  @Column(name = "meaning_ja", columnDefinition = "TEXT")
  private String meaningJa;

  /** 穴埋めに使う英文。空欄にする語は exampleAnswer */
  @Column(name = "example_en", columnDefinition = "TEXT")
  private String exampleEn;

  @Column(name = "example_answer", length = 60)
  private String exampleAnswer;

  @Column(name = "example_ja", columnDefinition = "TEXT")
  private String exampleJa;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private Source source;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private WordbookColor color = WordbookColor.NONE;

  @Enumerated(EnumType.STRING)
  @Column(name = "translation_status", nullable = false, length = 10)
  private TranslationStatus translationStatus = TranslationStatus.PENDING;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  protected WordbookWord() {
  }

  public WordbookWord(Long userId, String word, Source source, LocalDateTime now) {
    this.userId = userId;
    this.word = word;
    this.source = source;
    this.createdAt = now;
    this.updatedAt = now;
  }

  /** 読解の文を例文にして登録する。空欄の語は本文中の形(変化形のこともある) */
  public void setExample(String exampleEn, String exampleAnswer) {
    this.exampleEn = exampleEn;
    this.exampleAnswer = exampleAnswer;
  }

  public void setColor(WordbookColor color, LocalDateTime now) {
    this.color = color;
    this.updatedAt = now;
  }

  /** 利用者が直した訳。空にすると翌日の調査で取り直す */
  public void editMeaning(String meaningJa, LocalDateTime now) {
    this.meaningJa = meaningJa;
    this.translationStatus = WordbookTranslationRules.statusOf(meaningJa, exampleEn, exampleJa);
    this.updatedAt = now;
  }

  /** 調査しても訳が揃わなかった。翌日の調査で取り直す */
  public void markTranslationFailed(LocalDateTime now) {
    this.translationStatus = TranslationStatus.FAILED;
    this.updatedAt = now;
  }

  /** 日本語訳の調査の結果。取れなかった項目は既存の値を消さない */
  public void applyTranslation(String meaningJa, String exampleJa, LocalDateTime now) {
    if (this.meaningJa == null || this.meaningJa.isBlank()) {
      this.meaningJa = meaningJa;
    }
    if (this.exampleJa == null || this.exampleJa.isBlank()) {
      this.exampleJa = exampleJa;
    }
    this.translationStatus = WordbookTranslationRules.statusOf(this.meaningJa, exampleEn, this.exampleJa);
    this.updatedAt = now;
  }

  public Long getId() { return id; }
  public Long getUserId() { return userId; }
  public String getWord() { return word; }
  public String getMeaningJa() { return meaningJa; }
  public String getExampleEn() { return exampleEn; }
  public String getExampleAnswer() { return exampleAnswer; }
  public String getExampleJa() { return exampleJa; }
  public Source getSource() { return source; }
  public WordbookColor getColor() { return color; }
  public TranslationStatus getTranslationStatus() { return translationStatus; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
}
