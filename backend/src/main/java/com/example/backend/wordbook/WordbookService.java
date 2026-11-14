package com.example.backend.wordbook;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.wordbook.WordbookWord.Source;
import com.example.backend.wordbook.dto.AddWordResponse;
import com.example.backend.wordbook.dto.SummaryView;
import com.example.backend.wordbook.dto.WordView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
  private final CurrentUserProvider currentUserProvider;

  public WordbookService(WordbookWordRepository repository, CurrentUserProvider currentUserProvider) {
    this.repository = repository;
    this.currentUserProvider = currentUserProvider;
  }

  /** 利用者の単語すべて(登録順)。出題もこの一覧から選ぶ */
  public List<WordbookWord> ownedWords() {
    return repository.findByUserIdOrderByIdAsc(currentUserProvider.getCurrentUserId());
  }

  public List<WordView> list(WordbookColor color, String query) {
    String q = query == null ? "" : WordForms.normalize(query);
    return ownedWords().stream()
        .filter(w -> color == null || w.getColor() == color)
        .filter(w -> q.isEmpty() || w.getWord().contains(q)
            || (w.getMeaningJa() != null && w.getMeaningJa().contains(q)))
        .map(WordView::of)
        .toList();
  }

  public SummaryView summary() {
    List<WordbookWord> words = ownedWords();
    return new SummaryView(
        words.size(),
        count(words, WordbookColor.NONE),
        count(words, WordbookColor.BLUE),
        count(words, WordbookColor.YELLOW),
        count(words, WordbookColor.RED),
        words.stream().filter(w -> w.getTranslationStatus() != WordbookWord.TranslationStatus.DONE).count());
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
    List<WordbookWord> words = ownedWords();
    for (WordbookWord existing : words) {
      if (WordForms.sameWord(existing.getWord(), word)) {
        return new AddWordResponse(false, WordView.of(existing));
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
    return new AddWordResponse(true, WordView.of(repository.save(added)));
  }

  @Transactional
  public WordView setColor(Long id, String color) {
    WordbookWord word = owned(id);
    word.setColor(parseColor(color), LocalDateTime.now(JST));
    return WordView.of(repository.save(word));
  }

  /** 訳を直す。空にすると翌日の調査で取り直す */
  @Transactional
  public WordView setMeaning(Long id, String meaningJa) {
    WordbookWord word = owned(id);
    String trimmed = meaningJa == null || meaningJa.isBlank() ? null : meaningJa.trim();
    word.editMeaning(trimmed, LocalDateTime.now(JST));
    return WordView.of(repository.save(word));
  }

  @Transactional
  public void delete(Long id) {
    repository.delete(owned(id));
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
