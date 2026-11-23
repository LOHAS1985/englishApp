package com.example.backend.wordbook;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.stats.StudyLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 日本語の混じった例文を直す。以前は文法・語彙の解説(日本語)から選んだ語も、解説の文をそのまま例文にしていたので、
 * 穴埋めの問題文に日本語が出ていた(登録時の処理は WordbookService.add で直した)。
 * 起動のたびに確かめる(該当する語が無ければ何もしない。利用者の語は数百件なので軽い)
 */
@Component
public class WordbookExampleRepair {

  private static final Logger logger = LoggerFactory.getLogger(WordbookExampleRepair.class);

  private final WordbookWordRepository words;
  private final CurrentUserProvider currentUserProvider;

  public WordbookExampleRepair(WordbookWordRepository words, CurrentUserProvider currentUserProvider) {
    this.words = words;
    this.currentUserProvider = currentUserProvider;
  }

  /** @return 直した語の数 */
  @Transactional
  public int run() {
    LocalDateTime now = LocalDateTime.now(StudyLogService.JST);
    int repaired = 0;
    for (WordbookWord word : words.findByUserIdOrderByIdAsc(currentUserProvider.getCurrentUserId())) {
      if (!WordbookSentences.containsJapanese(word.getExampleEn())) {
        continue;
      }
      word.repairExample(WordbookSentences.englishPart(word.getExampleEn(), word.getExampleAnswer()), now);
      words.save(word);
      repaired++;
    }
    if (repaired > 0) {
      logger.info("単語帳の日本語の混じった例文を直しました: {} 語", repaired);
    }
    return repaired;
  }
}
