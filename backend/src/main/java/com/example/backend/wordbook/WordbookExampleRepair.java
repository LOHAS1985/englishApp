package com.example.backend.wordbook;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.stats.StudyLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 1文になっていない例文を直す。以前は文法・語彙の解説から選んだ語も、解説の文(日本語の混じった文や、
 * 「amicable / cordial / harmonious」のような同義語の並び)をそのまま例文にしていたので、穴埋めの問題文が崩れていた
 * (登録時の処理は WordbookService.add で直した。判定は WordbookSentences.isSentence)。
 * 英語の1文を取り出せればそれだけを残し、取り出せなければ例文を外して、例文を Gemini で作り直す(WordbookEnrichmentService)。
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
      // 同梱語は問題集で検査済み(BundledWordsTests)。登録した語で、例文が1文になっていないものだけ直す
      if (word.getBundledId() != null || word.getExampleEn() == null) {
        continue;
      }
      String part = WordbookSentences.englishPart(word.getExampleEn(), word.getExampleAnswer());
      if (word.getExampleEn().equals(part)) {
        continue;
      }
      word.repairExample(part, now);
      words.save(word);
      repaired++;
    }
    if (repaired > 0) {
      logger.info("単語帳の1文になっていない例文を直しました: {} 語", repaired);
    }
    return repaired;
  }
}
