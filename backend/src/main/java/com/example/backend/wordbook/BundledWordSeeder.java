package com.example.backend.wordbook;

import com.example.backend.common.AppState;
import com.example.backend.common.AppStateRepository;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.stats.StudyLogService;
import com.example.backend.wordbook.BundledWordBank.BundledWord;
import com.example.backend.wordbook.WordbookWord.Source;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

/**
 * 同梱の単語を利用者の単語帳へ入れる。版を state に残し、一度入れたら再起動では入れ直さない
 * (利用者が削除した語が戻ってしまうのを防ぐ)。同梱の内容を変えるときは版を上げる。
 */
@Component
public class BundledWordSeeder {

  static final String STATE_KEY = "wordbook.bundled.version";
  static final String VERSION = "1";

  private final BundledWordBank bank;
  private final WordbookWordRepository repository;
  private final AppStateRepository states;
  private final CurrentUserProvider currentUserProvider;

  public BundledWordSeeder(BundledWordBank bank, WordbookWordRepository repository, AppStateRepository states,
      CurrentUserProvider currentUserProvider) {
    this.bank = bank;
    this.repository = repository;
    this.states = states;
    this.currentUserProvider = currentUserProvider;
  }

  @Transactional
  public void seedIfNeeded() {
    if (states.findById(STATE_KEY).map(AppState::getValue).filter(VERSION::equals).isPresent()) {
      return;
    }
    Long userId = currentUserProvider.getCurrentUserId();
    List<WordbookWord> existing = repository.findByUserIdOrderByIdAsc(userId);
    LocalDateTime now = LocalDateTime.now(StudyLogService.JST);
    for (BundledWord item : bank.all()) {
      // 利用者がすでに登録している語(変化形を含む)は、同梱の訳で上書きせず残す
      if (existing.stream().anyMatch(w -> WordForms.sameWord(w.getWord(), item.word()))) {
        continue;
      }
      WordbookWord word = new WordbookWord(userId, item.word().toLowerCase(Locale.ROOT), Source.BUNDLED, now);
      word.setExample(item.example().en(), item.example().answer().toLowerCase(Locale.ROOT));
      word.applyTranslation(item.meaningJa(), item.example().ja(), now);
      repository.save(word);
    }
    states.save(new AppState(STATE_KEY, VERSION));
  }
}
