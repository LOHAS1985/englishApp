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
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * 同梱の単語を利用者の単語帳へ入れる・更新する。
 * 同梱の内容(語・訳・例文)のハッシュを state に残し、起動時に前回と違えば反映する(JSON を直せば、手順なしで本番に届く)。
 * <ul>
 * <li>新しい語は追加する。利用者が削除した語は戻さない({@link DeletedBundledWord})</li>
 * <li>すでにある語は、訳・例文を同梱の内容に更新する。利用者が訳・例文を直した語は上書きしない。出題回数・復習日・色は残す</li>
 * <li>同じ語(変化形を含む)を利用者が自分で登録していれば、その語は触らない</li>
 * </ul>
 */
@Component
public class BundledWordSeeder {

  static final String STATE_KEY = "wordbook.bundled.version";
  /** 旧版(同梱語を一度だけ入れていた)の値。この版の単語帳に無い同梱語は、利用者が削除した語とみなす */
  static final String LEGACY_VERSION = "1";
  private static final String VERSION_PREFIX = "2:";

  private final BundledWordBank bank;
  private final WordbookWordRepository repository;
  private final DeletedBundledWordRepository deleted;
  private final AppStateRepository states;
  private final CurrentUserProvider currentUserProvider;

  public BundledWordSeeder(BundledWordBank bank, WordbookWordRepository repository,
      DeletedBundledWordRepository deleted, AppStateRepository states, CurrentUserProvider currentUserProvider) {
    this.bank = bank;
    this.repository = repository;
    this.deleted = deleted;
    this.states = states;
    this.currentUserProvider = currentUserProvider;
  }

  @Transactional
  public void seedIfNeeded() {
    String version = VERSION_PREFIX + bank.contentHash();
    String previous = states.findById(STATE_KEY).map(AppState::getValue).orElse(null);
    if (version.equals(previous)) {
      return;
    }
    Long userId = currentUserProvider.getCurrentUserId();
    List<WordbookWord> existing = repository.findByUserIdOrderByIdAsc(userId);
    Map<String, WordbookWord> byBundledId = new HashMap<>();
    Map<String, WordbookWord> byHeadword = new HashMap<>();
    for (WordbookWord w : existing) {
      byHeadword.put(w.getWord().toLowerCase(Locale.ROOT), w);
      if (w.getBundledId() != null) {
        byBundledId.put(w.getBundledId(), w);
      }
    }
    Set<String> deletedIds = new HashSet<>();
    deleted.findByUserId(userId).forEach(d -> deletedIds.add(d.getBundledId()));
    boolean fromLegacy = LEGACY_VERSION.equals(previous);
    LocalDateTime now = LocalDateTime.now(StudyLogService.JST);

    for (BundledWord item : bank.all()) {
      WordbookWord linked = byBundledId.get(item.id());
      if (linked != null) {
        if (linked.applyBundled(item, now)) {
          repository.save(linked);
        }
        continue;
      }
      if (deletedIds.contains(item.id())) {
        continue;
      }
      // 見出し語が同じ語を先に探す(変化形まで調べる照合は重いので、見つからないときだけ行う)
      WordbookWord sameWord = byHeadword.get(item.word().toLowerCase(Locale.ROOT));
      if (sameWord == null) {
        sameWord = existing.stream()
            .filter(w -> WordForms.sameWord(w.getWord(), item.word())).findFirst().orElse(null);
      }
      if (sameWord != null) {
        // 旧版が入れた語は同梱の語に結び付ける。内容が同梱と違う語は、利用者が訳・例文を直した語とみなして上書きしない。
        // 利用者が自分で登録した語(手動・読解)は触らない
        if (sameWord.getSource() == Source.BUNDLED && sameWord.getBundledId() == null) {
          sameWord.linkBundled(item.id(), !sameWord.sameContentAs(item));
          repository.save(sameWord);
        }
        continue;
      }
      if (fromLegacy) {
        // 旧版は全部の語を一度に入れていた。いま単語帳に無い語は、利用者が削除した語なので戻さない
        deleted.save(new DeletedBundledWord(userId, item.id()));
        continue;
      }
      WordbookWord word = new WordbookWord(userId, item.word().toLowerCase(Locale.ROOT), Source.BUNDLED, now);
      word.setExample(item.example().en(), item.example().answer().toLowerCase(Locale.ROOT));
      word.applyTranslation(item.meaningJa(), item.example().ja(), now);
      word.linkBundled(item.id(), false);
      repository.save(word);
    }
    states.save(new AppState(STATE_KEY, version));
  }
}
