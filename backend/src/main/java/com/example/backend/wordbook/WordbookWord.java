package com.example.backend.wordbook;

import jakarta.persistence.*;
import java.time.LocalDate;
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

  /** 出題した回数と、そのうち正解した回数 */
  @Column(name = "times_asked", nullable = false)
  private int timesAsked;

  @Column(name = "times_correct", nullable = false)
  private int timesCorrect;

  /** 復習の段階。まだ一度も出していない語(新規)は null。段階が進むほど復習の間隔が延びる */
  @Column(name = "review_stage")
  private Integer reviewStage;

  /** 次の復習日。新規の語は null */
  @Column(name = "next_due_date")
  private LocalDate nextDueDate;

  @Column(name = "last_asked_at")
  private LocalDateTime lastAskedAt;

  /** 同梱の語の ID(w0001 など)。手動・読解から登録した語は null */
  @Column(name = "bundled_id", length = 20)
  private String bundledId;

  /** 品詞(v 動詞・adj 形容詞・n 名詞)。4択の誤答を同じ品詞から選ぶのに使う。手動・読解から登録した語は null */
  @Column(length = 10)
  private String pos;

  /** 品詞ごとの主な意味(JSON)。手動・読解から登録した語に Gemini で補う。同梱語は問題集から引くので空 */
  @Column(name = "senses_json", columnDefinition = "TEXT")
  private String sensesJson;

  /** 例文などを補った(補えないと判断した)日時。NULL の語だけを次の調査で補う */
  @Column(name = "enriched_at")
  private LocalDateTime enrichedAt;

  /** 同梱の水準(1 易しい・2 標準)。手動・読解から登録した語は null */
  @Column
  private Integer level;

  /** 利用者が訳・例文を直した語。同梱の内容を更新するとき、この語は上書きしない */
  @Column(name = "user_edited", nullable = false)
  private boolean userEdited;

  /** 出題の対象にする語か。同梱語は、一周目の進み具合に合わせて少しずつ解放する(V21)。解放前の語は一覧にも出さない */
  @Column(name = "unlocked", nullable = false)
  private boolean unlocked = true;

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

  /** 復習の間隔(日)。段階 0〜4 に対応する。間違えたら段階 0 に戻る */
  static final int[] INTERVAL_DAYS = { 1, 3, 7, 14, 30 };

  /**
   * 解答を反映する。間違えたら翌日の復習にして、色を赤にする(手動で付けた色より優先する)。
   * 正解したら、復習日が来ていれば段階を進めて間隔を延ばす。初めて出した語の正解は段階 1(3日後)から始める。
   * 復習日より前の正解(出せる語が他に無いときなど)は、間隔を進めない(すぐ後に解いた正解は定着の証拠にならない)。
   * 正解が続いても色は変えない(色は利用者が付ける)。
   */
  public void recordAnswer(boolean correct, LocalDateTime now) {
    LocalDate today = now.toLocalDate();
    timesAsked++;
    lastAskedAt = now;
    if (!correct) {
      reviewStage = 0;
      nextDueDate = today.plusDays(INTERVAL_DAYS[0]);
      if (color != WordbookColor.RED) {
        color = WordbookColor.RED;
        updatedAt = now;
      }
      return;
    }
    timesCorrect++;
    if (reviewStage == null) {
      reviewStage = 1;
      nextDueDate = today.plusDays(INTERVAL_DAYS[1]);
    } else if (nextDueDate == null || !nextDueDate.isAfter(today)) {
      reviewStage = Math.min(reviewStage + 1, INTERVAL_DAYS.length - 1);
      nextDueDate = today.plusDays(INTERVAL_DAYS[reviewStage]);
    }
  }

  /** 過去の解答記録から、復習の状態を復元する(列を足した直後の1回だけ)。最後の解答の正誤で、段階と次の復習日を決める */
  void restoreSchedule(int timesAsked, int timesCorrect, LocalDateTime lastAskedAt, boolean lastCorrect) {
    this.timesAsked = timesAsked;
    this.timesCorrect = timesCorrect;
    this.lastAskedAt = lastAskedAt;
    this.reviewStage = lastCorrect ? 1 : 0;
    this.nextDueDate = lastAskedAt.toLocalDate().plusDays(INTERVAL_DAYS[reviewStage]);
  }

  /** まだ一度も出していない語 */
  public boolean isUnseen() {
    return reviewStage == null;
  }

  /** 復習日が来ている(過ぎている)語 */
  public boolean isDue(LocalDate today) {
    return nextDueDate != null && !nextDueDate.isAfter(today);
  }

  public void setColor(WordbookColor color, LocalDateTime now) {
    this.color = color;
    this.updatedAt = now;
  }

  /** 利用者が直した訳。空にすると翌日の調査で取り直す。直した語は、同梱の内容の更新で上書きしない */
  public void editMeaning(String meaningJa, LocalDateTime now) {
    this.meaningJa = meaningJa;
    this.translationStatus = WordbookTranslationRules.statusOf(meaningJa, exampleEn, exampleJa);
    this.userEdited = true;
    this.updatedAt = now;
  }

  /**
   * 利用者が直した例文。例文の訳を空にすると翌日の調査で取り直す(取れるまで出題しない)。
   * 直した語は、同梱の内容の更新で上書きしない
   */
  public void editExample(String exampleEn, String exampleAnswer, String exampleJa, LocalDateTime now) {
    this.exampleEn = exampleEn;
    this.exampleAnswer = exampleAnswer;
    this.exampleJa = exampleJa;
    this.translationStatus = WordbookTranslationRules.statusOf(meaningJa, exampleEn, exampleJa);
    this.userEdited = true;
    this.updatedAt = now;
  }

  /**
   * 1文になっていない例文を直す(文法・語彙の解説から登録した語)。英語の部分(englishPart)があればそれだけにし、
   * 例文の訳は混じった文を訳したものなので消して翌日の調査で取り直す。英語の部分が無ければ例文を外す
   * (外した語は4択だけに出す)。利用者が直した印は付けない(同梱の更新の扱いを変えないため)
   */
  void repairExample(String englishPart, LocalDateTime now) {
    if (englishPart == null) {
      this.exampleEn = null;
      this.exampleAnswer = null;
      // 登録した語は、例文を Gemini で作り直す(補った印を外すと、次の調査で補われる)
      if (bundledId == null) {
        this.enrichedAt = null;
      }
    } else {
      this.exampleEn = englishPart;
    }
    this.exampleJa = null;
    this.translationStatus = WordbookTranslationRules.statusOf(meaningJa, exampleEn, exampleJa);
    this.updatedAt = now;
  }

  /** 同梱の語に結び付ける。利用者がすでに訳・例文を直していた語は、更新で上書きしない */
  void linkBundled(String bundledId, boolean userEdited) {
    this.bundledId = bundledId;
    this.userEdited = userEdited;
  }

  /**
   * 同梱の内容(訳・例文)で更新する。利用者が直した語は触らない。
   *
   * @return 内容が変わったら true
   */
  boolean applyBundled(BundledWordBank.BundledWord item, LocalDateTime now) {
    boolean changed = applyBundledMetadata(item, now);
    if (userEdited || sameContentAs(item)) {
      return changed;
    }
    this.meaningJa = item.meaningJa();
    this.exampleEn = item.example().en();
    this.exampleAnswer = item.example().answer().toLowerCase(java.util.Locale.ROOT);
    this.exampleJa = item.example().ja();
    this.translationStatus = WordbookTranslationRules.statusOf(meaningJa, exampleEn, exampleJa);
    this.updatedAt = now;
    return true;
  }

  /**
   * 品詞と水準(利用者が直せないので、直した語にも反映する)。水準を初めて知った語のうち、易しい語はまだ色を付けておらず
   * 一度も出していなければ青にする(出題を後回しにする。すでに色を付けた語・出した語は変えない)。
   */
  boolean applyBundledMetadata(BundledWordBank.BundledWord item, LocalDateTime now) {
    int newLevel = item.level() == null ? 2 : item.level();
    boolean changed = !java.util.Objects.equals(pos, item.pos()) || !java.util.Objects.equals(level, newLevel);
    if (level == null && newLevel == 1 && color == WordbookColor.NONE && timesAsked == 0) {
      color = WordbookColor.BLUE;
      changed = true;
    }
    this.pos = item.pos();
    this.level = newLevel;
    if (changed) {
      this.updatedAt = now;
    }
    return changed;
  }

  /** 訳・例文が同梱の内容と同じか */
  boolean sameContentAs(BundledWordBank.BundledWord item) {
    return java.util.Objects.equals(meaningJa, item.meaningJa())
        && java.util.Objects.equals(exampleEn, item.example().en())
        && java.util.Objects.equals(exampleAnswer, item.example().answer().toLowerCase(java.util.Locale.ROOT))
        && java.util.Objects.equals(exampleJa, item.example().ja());
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

  /** 例文などを補う対象か(手動・読解から登録した語で、まだ補っていない語) */
  public boolean needsEnrichment() {
    return bundledId == null && enrichedAt == null;
  }

  /**
   * Gemini で補った情報を反映する。持っていない項目だけを埋め、利用者や DeepL が入れた値は上書きしない
   * (例文は、例文が無いときだけ例文・空欄の語・例文の訳をまとめて入れる)。何も補えなくても補った印は付ける
   * (同じ語で何度も呼ばないため)
   */
  void applyEnrichment(Enrichment e, LocalDateTime now) {
    if (pos == null && e.pos() != null) {
      pos = e.pos();
    }
    if ((meaningJa == null || meaningJa.isBlank()) && e.meaningJa() != null) {
      meaningJa = e.meaningJa();
    }
    if (exampleEn == null && e.exampleEn() != null) {
      exampleEn = e.exampleEn();
      exampleAnswer = e.exampleAnswer();
      exampleJa = e.exampleJa();
    }
    if (sensesJson == null && e.sensesJson() != null) {
      sensesJson = e.sensesJson();
    }
    enrichedAt = now;
    translationStatus = WordbookTranslationRules.statusOf(meaningJa, exampleEn, exampleJa);
    updatedAt = now;
  }

  /** 補う情報。どの項目も、検査を通らなければ null(WordbookEnrichmentService が作る) */
  record Enrichment(String pos, String meaningJa, String exampleEn, String exampleAnswer, String exampleJa,
      String sensesJson) {
  }

  /** 訳が揃っているか。揃うまでは4択にも穴埋めにも出さない */
  public boolean isTranslated() {
    return translationStatus == TranslationStatus.DONE;
  }

  /** 4択に出せるか(訳が揃っている) */
  public boolean canAskChoice() {
    return isTranslated() && meaningJa != null;
  }

  /** 穴埋めに出せるか(訳が揃っていて、例文・空欄の語・例文の訳がある) */
  public boolean canAskFill() {
    return isTranslated() && exampleEn != null && exampleAnswer != null && exampleJa != null;
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
  public String getPos() { return pos; }
  public Integer getLevel() { return level; }
  public String getBundledId() { return bundledId; }
  public String getSensesJson() { return sensesJson; }
  public LocalDateTime getEnrichedAt() { return enrichedAt; }
  public boolean isUnlocked() { return unlocked; }

  /** 解放する(または、解放前に戻す)。同梱語の解放の処理(WordbookUnlockService)と、投入の処理が使う */
  void setUnlocked(boolean unlocked) {
    this.unlocked = unlocked;
  }
  public boolean isUserEdited() { return userEdited; }
  public int getTimesAsked() { return timesAsked; }
  public int getTimesCorrect() { return timesCorrect; }
  public Integer getReviewStage() { return reviewStage; }
  public LocalDate getNextDueDate() { return nextDueDate; }
  public LocalDateTime getLastAskedAt() { return lastAskedAt; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
}
