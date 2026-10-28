package com.example.backend.vocab;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/** 英英辞書の取得。例文が多い Wordnik(要APIキー)と、キー不要の dictionaryapi.dev を使い分ける */
@Component
public class DictionaryApiClient {

  private static final Logger logger = LoggerFactory.getLogger(DictionaryApiClient.class);
  private static final int MAX_ATTEMPTS = 3;
  private static final long RETRY_WAIT_MILLIS = 500;

  /** 見つからなかった項目は null */
  public record DictionaryEntry(String definition, String example) {
    static final DictionaryEntry EMPTY = new DictionaryEntry(null, null);
  }

  private final WebClient webClient = WebClient.create();
  private final String wordnikApiKey;

  public DictionaryApiClient(@Value("${wordnik.api-key:}") String wordnikApiKey) {
    this.wordnikApiKey = wordnikApiKey;
  }

  public boolean isWordnikEnabled() {
    return !wordnikApiKey.isBlank();
  }

  public DictionaryEntry lookupWordnik(String word) {
    if (!isWordnikEnabled()) {
      return DictionaryEntry.EMPTY;
    }
    return new DictionaryEntry(fetchWordnikDefinition(word), fetchWordnikExample(word));
  }

  private String fetchWordnikDefinition(String word) {
    try {
      List<Map<String, Object>> defs = webClient.get()
          .uri("https://api.wordnik.com/v4/word.json/{word}/definitions"
              + "?limit=1&includeRelated=false&useCanonical=false&api_key={key}", word, wordnikApiKey)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
          })
          .block();
      if (defs != null && !defs.isEmpty() && defs.get(0).get("text") != null) {
        return defs.get(0).get("text").toString();
      }
    } catch (Exception e) {
      logger.warn("Wordnik definition lookup failed: {}", e.getMessage());
    }
    return null;
  }

  private String fetchWordnikExample(String word) {
    try {
      Map<String, Object> response = webClient.get()
          .uri("https://api.wordnik.com/v4/word.json/{word}/examples"
              + "?includeDuplicates=false&useCanonical=false&limit=1&api_key={key}", word, wordnikApiKey)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
          })
          .block();
      if (response != null && response.get("examples") instanceof List<?> examples && !examples.isEmpty()
          && examples.get(0) instanceof Map<?, ?> example && example.get("text") != null) {
        return example.get("text").toString();
      }
    } catch (Exception e) {
      logger.warn("Wordnik example lookup failed: {}", e.getMessage());
    }
    return null;
  }

  /** 空の応答や通信エラーは一時的なことが多いので、少し待って再試行する */
  public DictionaryEntry lookupFreeDictionary(String word) {
    for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        List<Map<String, Object>> response = webClient.get()
            .uri("https://api.dictionaryapi.dev/api/v2/entries/en/{word}", word)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
            })
            .block();

        if (response != null && !response.isEmpty()) {
          return parseFreeDictionary(response);
        }
        logger.warn("dictionary lookup returned empty (attempt {})", attempt);
      } catch (Exception e) {
        logger.warn("dictionary lookup failed (attempt {}): {}", attempt, e.getMessage());
      }
      if (attempt < MAX_ATTEMPTS && !sleepBeforeRetry()) {
        break;
      }
    }
    return DictionaryEntry.EMPTY;
  }

  private DictionaryEntry parseFreeDictionary(List<Map<String, Object>> response) {
    Object meanings = response.get(0).get("meanings");
    if (!(meanings instanceof List<?> meaningItems) || meaningItems.isEmpty()
        || !(meaningItems.get(0) instanceof Map<?, ?> meaning)) {
      logger.warn("dictionary response missing meanings");
      return DictionaryEntry.EMPTY;
    }

    Object definitions = meaning.get("definitions");
    if (!(definitions instanceof List<?> definitionItems) || definitionItems.isEmpty()
        || !(definitionItems.get(0) instanceof Map<?, ?> definition)) {
      logger.warn("dictionary response missing definitions");
      return DictionaryEntry.EMPTY;
    }

    return new DictionaryEntry(
        definition.get("definition") == null ? null : definition.get("definition").toString(),
        definition.get("example") == null ? null : definition.get("example").toString());
  }

  private boolean sleepBeforeRetry() {
    try {
      Thread.sleep(RETRY_WAIT_MILLIS);
      return true;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return false;
    }
  }
}
