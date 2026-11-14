package com.example.backend.wordbook;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.stats.StudyLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 日本語訳の調査。訳が揃っていない語について、語の訳と例文の訳を DeepL で取る。
 * 外部APIの通信中にトランザクションを開けたままにしないよう、語ごとに保存する。
 */
@Service
public class WordbookTranslationService {

  private static final Logger logger = LoggerFactory.getLogger(WordbookTranslationService.class);

  private final WordbookWordRepository repository;
  private final DeepLApiClient deepLApiClient;
  private final CurrentUserProvider currentUserProvider;

  public WordbookTranslationService(WordbookWordRepository repository, DeepLApiClient deepLApiClient,
      CurrentUserProvider currentUserProvider) {
    this.repository = repository;
    this.deepLApiClient = deepLApiClient;
    this.currentUserProvider = currentUserProvider;
  }

  /** @return 今回の調査で訳が揃った語数 */
  public int translatePending() {
    int completed = 0;
    for (WordbookWord word : repository.findByUserIdOrderByIdAsc(currentUserProvider.getCurrentUserId())) {
      if (word.getTranslationStatus() == WordbookWord.TranslationStatus.DONE) {
        continue;
      }
      LocalDateTime now = LocalDateTime.now(StudyLogService.JST);
      String meaningJa = isBlank(word.getMeaningJa()) ? deepLApiClient.translateToJapanese(word.getWord()) : null;
      String exampleJa = isBlank(word.getExampleEn()) || !isBlank(word.getExampleJa()) ? null
          : deepLApiClient.translateToJapanese(word.getExampleEn());
      word.applyTranslation(meaningJa, exampleJa, now);
      if (word.getTranslationStatus() == WordbookWord.TranslationStatus.DONE) {
        completed++;
      } else {
        word.markTranslationFailed(now);
        logger.warn("単語帳の日本語訳が取れませんでした: {}", word.getWord());
      }
      repository.save(word);
    }
    return completed;
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
