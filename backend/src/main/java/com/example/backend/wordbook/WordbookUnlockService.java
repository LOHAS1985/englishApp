package com.example.backend.wordbook;

import com.example.backend.common.AppStateRepository;
import com.example.backend.config.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 同梱語の解放。以前は1日20語ずつ解放していたが、利用者の要望で、同梱語は入れたらすぐ出すようにした(2026-11-26)。
 * 以前の版で解放前のまま残っている語を、単語帳を開いたときにすべて解放する(本番 DB に解放前の語が残っているため)。
 */
@Service
public class WordbookUnlockService {

  /** 以前の版が使っていた解放の状態(もう使わないので消す) */
  static final List<String> LEGACY_KEYS = List.of("wordbook.unlock.first_pass_done_on", "wordbook.unlock.released_on");

  private final WordbookWordRepository repository;
  private final AppStateRepository states;
  private final CurrentUserProvider currentUserProvider;

  public WordbookUnlockService(WordbookWordRepository repository, AppStateRepository states,
      CurrentUserProvider currentUserProvider) {
    this.repository = repository;
    this.states = states;
    this.currentUserProvider = currentUserProvider;
  }

  /** 解放前の語が残っていれば、すべて解放する。単語帳を開くたびに呼ばれる(残っていなければ何もしない) */
  @Transactional
  public void releaseIfDue() {
    List<WordbookWord> locked = repository.findByUserIdOrderByIdAsc(currentUserProvider.getCurrentUserId()).stream()
        .filter(w -> !w.isUnlocked())
        .toList();
    if (locked.isEmpty()) {
      return;
    }
    locked.forEach(w -> {
      w.setUnlocked(true);
      repository.save(w);
    });
    LEGACY_KEYS.forEach(key -> states.findById(key).ifPresent(states::delete));
  }
}
