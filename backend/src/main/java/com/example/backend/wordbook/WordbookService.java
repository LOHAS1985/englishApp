package com.example.backend.wordbook;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.wordbook.BundledWordBank.Sense;
import com.example.backend.wordbook.WordbookWord.Source;
import com.example.backend.wordbook.dto.AddWordResponse;
import com.example.backend.wordbook.dto.SummaryView;
import com.example.backend.wordbook.dto.WordView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import static com.example.backend.stats.StudyLogService.JST;

/** 単語帳の登録・一覧・色・訳の管理。出題と解答は WordbookQuizService が扱う */
@Service
public class WordbookService {

  /** 英単語1語(文字・アポストロフィ・ハイフン)。句や文は登録しない */
  private static final Pattern SINGLE_WORD = Pattern.compile("[a-z][a-z'-]*");
  private static final int MAX_WORD_LENGTH = 60;

  private final WordbookWordRepository repository;
  private final DeletedBundledWordRepository deletedBundled;
  private final WordbookUnlockService unlocks;
  private final CurrentUserProvider currentUserProvider;
  private final BundledWordBank bundledWords;

  public WordbookService(WordbookWordRepository repository, DeletedBundledWordRepository deletedBundled,
      WordbookUnlockService unlocks, CurrentUserProvider currentUserProvider, BundledWordBank bundledWords) {
    this.repository = repository;
    this.deletedBundled = deletedBundled;
    this.unlocks = unlocks;
    this.currentUserProvider = currentUserProvider;
    this.bundledWords = bundledWords;
  }

  /** 品詞ごとの主な意味(同梱語にある語だけ)。DB には持たず、同梱の問題集から引く(直したら次の起動で反映される) */
  public List<Sense> sensesOf(WordbookWord word) {
    return bundledWords.sensesOf(word.getBundledId(), word.getWord());
  }

  private WordView view(WordbookWord word) {
    return WordView.of(word, sensesOf(word));
  }

  /**
   * 出せる単語(解放済み。登録順)。出題も一覧もこの中から選ぶ。
   * 同梱語の解放は、ここを開くときに今日の分を行う(WordbookUnlockService)
   */
  public List<WordbookWord> ownedWords() {
    unlocks.releaseIfDue();
    return allOwnedWords().stream().filter(WordbookWord::isUnlocked).toList();
  }

  /** 利用者の語すべて(解放前の同梱語を含む)。重複の確認や、同梱語の投入に使う */
  List<WordbookWord> allOwnedWords() {
    return repository.findByUserIdOrderByIdAsc(currentUserProvider.getCurrentUserId());
  }

  public List<WordView> list(WordbookColor color, String query) {
    String q = query == null ? "" : WordForms.normalize(query);
    return ownedWords().stream()
        .filter(w -> color == null || w.getColor() == color)
        .filter(w -> q.isEmpty() || w.getWord().contains(q)
            || (w.getMeaningJa() != null && w.getMeaningJa().contains(q)))
        .map(this::view)
        .toList();
  }

  public SummaryView summary() {
    List<WordbookWord> words = ownedWords();
    LocalDate today = LocalDate.now(JST);
    // 出題できる語(訳が揃っている語)のうち、今日復習する語と、まだ一度も出していない語
    List<WordbookWord> ready = words.stream()
        .filter(w -> w.getTranslationStatus() == WordbookWord.TranslationStatus.DONE).toList();
    return new SummaryView(
        words.size(),
        count(words, WordbookColor.NONE),
        count(words, WordbookColor.BLUE),
        count(words, WordbookColor.YELLOW),
        count(words, WordbookColor.RED),
        words.size() - ready.size(),
        ready.stream().filter(w -> w.isDue(today)).count(),
        ready.stream().filter(WordbookWord::isUnseen).count());
  }

  public WordbookWord save(WordbookWord word) {
    return repository.save(word);
  }

  private static long count(List<WordbookWord> words, WordbookColor color) {
    return words.stream().filter(w -> w.getColor() == color).count();
  }

  /**
   * 単語を登録する。読解から登録するときは本文の文(exampleEn)と選んだ語(exampleAnswer)を送る。
   * 同じ語(変化形を含む)がすでにあれば追加せず、その語を返す。
   * 日本語訳は翻訳の調査(WordbookTranslationService)が後で付ける。
   */
  @Transactional
  public AddWordResponse add(String rawWord, String exampleEn, String exampleAnswer) {
    String word = normalizeWord(rawWord);
    // 解放前の同梱語とも比べる(同じ語を2つ持つと、一意の制約に当たるため)
    List<WordbookWord> words = allOwnedWords();
    for (WordbookWord existing : words) {
      if (WordForms.sameWord(existing.getWord(), word)) {
        return new AddWordResponse(false, view(existing));
      }
    }

    LocalDateTime now = LocalDateTime.now(JST);
    boolean fromReading = exampleEn != null && !exampleEn.isBlank();
    WordbookWord added = new WordbookWord(currentUserProvider.getCurrentUserId(), word,
        fromReading ? Source.READING : Source.MANUAL, now);
    if (fromReading) {
      String answer = exampleAnswer == null ? "" : exampleAnswer.trim().toLowerCase(Locale.ROOT);
      if (answer.isEmpty() || !WordbookSentences.contains(exampleEn, answer)) {
        throw new IllegalArgumentException("選んだ語が例文の中に見つかりません");
      }
      added.setExample(exampleEn.trim(), answer);
    }
    return new AddWordResponse(true, view(repository.save(added)));
  }

  @Transactional
  public WordView setColor(Long id, String color) {
    WordbookWord word = owned(id);
    word.setColor(parseColor(color), LocalDateTime.now(JST));
    return view(repository.save(word));
  }

  /** 訳を直す。空にすると翌日の調査で取り直す */
  @Transactional
  public WordView setMeaning(Long id, String meaningJa) {
    WordbookWord word = owned(id);
    String trimmed = meaningJa == null || meaningJa.isBlank() ? null : meaningJa.trim();
    word.editMeaning(trimmed, LocalDateTime.now(JST));
    return view(repository.save(word));
  }

  /**
   * 例文を直す。例文の訳を空にすると翌日の調査で取り直す(取れるまで穴埋めには出さない)。
   * 空欄にする語は例文の中に単語として入っていなければならない。
   */
  @Transactional
  public WordView setExample(Long id, String exampleEn, String exampleAnswer, String exampleJa) {
    WordbookWord word = owned(id);
    String en = exampleEn == null ? "" : exampleEn.trim();
    String answer = exampleAnswer == null ? "" : exampleAnswer.trim().toLowerCase(Locale.ROOT);
    if (en.isEmpty()) {
      throw new IllegalArgumentException("例文を入力してください");
    }
    if (answer.isEmpty() || !WordbookSentences.contains(en, answer)) {
      throw new IllegalArgumentException("空欄にする語が例文の中に見つかりません");
    }
    if (!WordForms.sameWord(word.getWord(), answer)) {
      throw new IllegalArgumentException("空欄にする語は「" + word.getWord() + "」の形にしてください");
    }
    String ja = exampleJa == null || exampleJa.isBlank() ? null : exampleJa.trim();
    word.editExample(en, answer, ja, LocalDateTime.now(JST));
    return view(repository.save(word));
  }

  @Transactional
  public void delete(Long id) {
    WordbookWord word = owned(id);
    // 同梱の内容を更新しても、削除した同梱語は戻さない
    if (word.getBundledId() != null) {
      deletedBundled.save(new DeletedBundledWord(word.getUserId(), word.getBundledId()));
    }
    repository.delete(word);
  }

  /** 利用者の語だけを返す。他の語の ID を指定されても触れないようにする */
  WordbookWord owned(Long id) {
    Long userId = currentUserProvider.getCurrentUserId();
    return repository.findById(id)
        .filter(w -> w.getUserId().equals(userId))
        .orElseThrow(() -> new IllegalArgumentException("単語が見つかりません"));
  }

  static WordbookColor parseColor(String color) {
    try {
      return WordbookColor.valueOf(color == null ? "" : color.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("色は NONE・BLUE・YELLOW・RED のいずれかです");
    }
  }

  /** 見出し語の正規化。英単語1語だけを受け付ける */
  static String normalizeWord(String raw) {
    String word = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
    if (word.isEmpty()) {
      throw new IllegalArgumentException("英単語を入力してください");
    }
    if (word.length() > MAX_WORD_LENGTH || !SINGLE_WORD.matcher(word).matches()) {
      throw new IllegalArgumentException("英単語を1語(英字)で入力してください");
    }
    return word;
  }
}
