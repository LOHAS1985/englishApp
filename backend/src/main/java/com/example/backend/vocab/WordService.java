package com.example.backend.vocab;

import com.example.backend.vocab.DictionaryApiClient.DictionaryEntry;
import org.springframework.stereotype.Service;

/** 管理画面からの単語登録。辞書で英語の意味・例文を補い、DeepL で日本語訳を付けて保存する */
@Service
public class WordService {

  private final WordRepository repo;
  private final DictionaryApiClient dictionaryApiClient;
  private final DeepLApiClient deepLApiClient;

  public WordService(WordRepository repo, DictionaryApiClient dictionaryApiClient,
      DeepLApiClient deepLApiClient) {
    this.repo = repo;
    this.dictionaryApiClient = dictionaryApiClient;
    this.deepLApiClient = deepLApiClient;
  }

  public Word fetchAndSave(String word) {
    return fetchAndSave(word, null, null);
  }

  public Word fetchAndSave(String word, String meaningEnOverride, String exampleEnOverride) {
    Word wordEntity = new Word(word);
    if (!isBlank(meaningEnOverride)) {
      wordEntity.setMeaningEn(meaningEnOverride);
    }
    if (!isBlank(exampleEnOverride)) {
      wordEntity.setExampleEn(exampleEnOverride);
    }

    fetchDictionaryDetails(word, wordEntity);

    if (isBlank(wordEntity.getMeaningEn()) && isBlank(wordEntity.getExampleEn())) {
      throw new IllegalStateException("English definition and example could not be retrieved");
    }

    String meaningJa = deepLApiClient.translateToJapanese(wordEntity.getMeaningEn());
    if (!isBlank(wordEntity.getMeaningEn()) && meaningJa == null) {
      throw new IllegalStateException("DeepL translation failed for the English definition");
    }
    if (meaningJa != null) {
      wordEntity.setMeaningJa(meaningJa);
    }

    String exampleJa = deepLApiClient.translateToJapanese(wordEntity.getExampleEn());
    if (!isBlank(wordEntity.getExampleEn()) && exampleJa == null) {
      throw new IllegalStateException("DeepL translation failed for the English example");
    }
    if (exampleJa != null) {
      wordEntity.setExampleJa(exampleJa);
    }

    return repo.save(wordEntity);
  }

  /** 入力済みの項目は上書きせず、空欄だけを辞書で埋める */
  private void fetchDictionaryDetails(String word, Word wordEntity) {
    if (!isBlank(wordEntity.getMeaningEn()) && !isBlank(wordEntity.getExampleEn())) {
      return;
    }

    // Wordnik は例文を持っていることが多いので先に試し、何も取れなければ dictionaryapi.dev へ
    if (dictionaryApiClient.isWordnikEnabled()) {
      fillBlanks(wordEntity, dictionaryApiClient.lookupWordnik(word));
      if (!isBlank(wordEntity.getMeaningEn()) || !isBlank(wordEntity.getExampleEn())) {
        return;
      }
    }

    fillBlanks(wordEntity, dictionaryApiClient.lookupFreeDictionary(word));
  }

  private void fillBlanks(Word wordEntity, DictionaryEntry entry) {
    if (isBlank(wordEntity.getMeaningEn()) && entry.definition() != null) {
      wordEntity.setMeaningEn(entry.definition());
    }
    if (isBlank(wordEntity.getExampleEn()) && entry.example() != null) {
      wordEntity.setExampleEn(entry.example());
    }
  }

  /** 保存せずに Wordnik の定義・例文だけを取得する(管理画面の動作確認用) */
  public DictionaryEntry fetchFromWordnik(String word) {
    if (isBlank(word)) {
      return DictionaryEntry.EMPTY;
    }
    return dictionaryApiClient.lookupWordnik(word);
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
