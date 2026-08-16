package com.example.backend.vocab;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class WordService {

  private final WordRepository repo;
  private final WebClient webClient = WebClient.create();
  private final String deeplAuthKey;
  private final String deeplApiUrl;

  public WordService(WordRepository repo,
      @Value("${deepl.auth-key:}") String deeplAuthKey,
      @Value("${deepl.api-url:https://api-free.deepl.com/v2/translate}") String deeplApiUrl) {
    this.repo = repo;
    this.deeplAuthKey = deeplAuthKey;
    this.deeplApiUrl = deeplApiUrl;
  }

  public Word fetchAndSave(String word) {
    return fetchAndSave(word, null, null);
  }

  public Word fetchAndSave(String word, String meaningEnOverride, String exampleEnOverride) {
    Word wordEntity = new Word(word);
    if (meaningEnOverride != null && !meaningEnOverride.isBlank()) {
      wordEntity.setMeaningEn(meaningEnOverride);
    }
    if (exampleEnOverride != null && !exampleEnOverride.isBlank()) {
      wordEntity.setExampleEn(exampleEnOverride);
    }

    fetchDictionaryDetails(word, wordEntity);

    String meaningJa = translateToJapanese(wordEntity.getMeaningEn());
    if (meaningJa != null) {
      wordEntity.setMeaningJa(meaningJa);
    }

    String exampleJa = translateToJapanese(wordEntity.getExampleEn());
    if (exampleJa != null) {
      wordEntity.setExampleJa(exampleJa);
    }

    return repo.save(wordEntity);
  }

  private void fetchDictionaryDetails(String word, Word wordEntity) {
    if (!isBlank(wordEntity.getMeaningEn()) && !isBlank(wordEntity.getExampleEn())) {
      return;
    }

    try {
      List<Map<String, Object>> response = webClient.get()
          .uri("https://api.dictionaryapi.dev/api/v2/entries/en/" + word)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
          })
          .block();

      if (response == null || response.isEmpty()) {
        return;
      }

      Object meanings = response.get(0).get("meanings");
      if (!(meanings instanceof List<?> meaningItems) || meaningItems.isEmpty()
          || !(meaningItems.get(0) instanceof Map<?, ?> meaning)) {
        return;
      }

      Object definitions = meaning.get("definitions");
      if (!(definitions instanceof List<?> definitionItems) || definitionItems.isEmpty()
          || !(definitionItems.get(0) instanceof Map<?, ?> definition)) {
        return;
      }

      if (isBlank(wordEntity.getMeaningEn()) && definition.get("definition") != null) {
        wordEntity.setMeaningEn(definition.get("definition").toString());
      }
      if (isBlank(wordEntity.getExampleEn()) && definition.get("example") != null) {
        wordEntity.setExampleEn(definition.get("example").toString());
      }
    } catch (Exception exception) {
      System.err.println("[WordService] dictionary lookup failed: " + exception.getMessage());
    }
  }

  private String translateToJapanese(String text) {
    if (isBlank(text) || deeplAuthKey.isBlank()) {
      return null;
    }

    try {
      Map<String, Object> response = webClient.post()
          .uri(deeplApiUrl)
          .body(BodyInserters.fromFormData("auth_key", deeplAuthKey)
              .with("text", text)
              .with("source_lang", "EN")
              .with("target_lang", "JA"))
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
          })
          .block();

      Object translations = response == null ? null : response.get("translations");
      if (translations instanceof List<?> translationItems && !translationItems.isEmpty()
          && translationItems.get(0) instanceof Map<?, ?> translation) {
        Object translatedText = translation.get("text");
        return translatedText == null ? null : translatedText.toString();
      }
    } catch (Exception exception) {
      System.err.println("[WordService] DeepL translation failed: " + exception.getMessage());
    }
    return null;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}