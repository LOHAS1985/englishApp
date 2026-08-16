package com.example.backend.vocab;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Service
public class WordService {

  private final WordRepository repo;
  private final WebClient webClient = WebClient.create();
  private final String deeplAuthKey;
  private final String deeplApiUrl;
  private final String wordnikApiKey;

  public WordService(WordRepository repo,
      @Value("${deepl.auth-key:}") String deeplAuthKey,
      @Value("${deepl.api-url:https://api-free.deepl.com/v2/translate}") String deeplApiUrl,
      @Value("${wordnik.api-key:}") String wordnikApiKey) {
    this.repo = repo;
    this.deeplAuthKey = deeplAuthKey;
    this.deeplApiUrl = deeplApiUrl;
    this.wordnikApiKey = wordnikApiKey;
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

    if (isBlank(wordEntity.getMeaningEn()) && isBlank(wordEntity.getExampleEn())) {
      throw new IllegalStateException("English definition and example could not be retrieved");
    }

    String meaningJa = translateToJapanese(wordEntity.getMeaningEn());
    if (!isBlank(wordEntity.getMeaningEn()) && meaningJa == null) {
      throw new IllegalStateException("DeepL translation failed for the English definition");
    }
    if (meaningJa != null) {
      wordEntity.setMeaningJa(meaningJa);
    }

    String exampleJa = translateToJapanese(wordEntity.getExampleEn());
    if (!isBlank(wordEntity.getExampleEn()) && exampleJa == null) {
      throw new IllegalStateException("DeepL translation failed for the English example");
    }
    if (exampleJa != null) {
      wordEntity.setExampleJa(exampleJa);
    }

    return repo.save(wordEntity);
  }

  private void fetchDictionaryDetails(String word, Word wordEntity) {
    if (!isBlank(wordEntity.getMeaningEn()) && !isBlank(wordEntity.getExampleEn())) {
      return;
    }

    // Try Wordnik first if API key is provided — Wordnik often contains example
    // sentences.
    if (!isBlank(wordnikApiKey)) {
      try {
        List<Map<String, Object>> defs = webClient.get()
            .uri("https://api.wordnik.com/v4/word.json/" + word
                + "/definitions?limit=1&includeRelated=false&useCanonical=false&api_key=" + wordnikApiKey)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
            })
            .block();

        if (defs != null && !defs.isEmpty() && defs.get(0).get("text") != null) {
          if (isBlank(wordEntity.getMeaningEn())) {
            wordEntity.setMeaningEn(defs.get(0).get("text").toString());
          }
        }

        Map<String, Object> examplesResp = webClient.get()
            .uri("https://api.wordnik.com/v4/word.json/" + word
                + "/examples?includeDuplicates=false&useCanonical=false&limit=1&api_key=" + wordnikApiKey)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
            })
            .block();

        if (examplesResp != null && examplesResp.get("examples") instanceof List<?> exList && !exList.isEmpty()) {
          Object ex0 = exList.get(0);
          if (ex0 instanceof Map<?, ?> exMap && exMap.get("text") != null) {
            if (isBlank(wordEntity.getExampleEn())) {
              wordEntity.setExampleEn(exMap.get("text").toString());
            }
          }
        }

        if (!isBlank(wordEntity.getMeaningEn()) || !isBlank(wordEntity.getExampleEn())) {
          return;
        }
      } catch (Exception e) {
        System.err.println("[WordService] Wordnik lookup failed: " + e.getMessage());
        // fall through to existing dictionaryapi.dev logic
      }
    }

    int maxAttempts = 3;
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        List<Map<String, Object>> response = webClient.get()
            .uri("https://api.dictionaryapi.dev/api/v2/entries/en/" + word)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
            })
            .block();

        if (response == null || response.isEmpty()) {
          System.err.println("[WordService] dictionary lookup returned empty (attempt " + attempt + ")");
          if (attempt < maxAttempts) {
            try {
              Thread.sleep(500);
            } catch (InterruptedException ie) {
              Thread.currentThread().interrupt();
              return;
            }
            continue;
          }
          return;
        }

        Object meanings = response.get(0).get("meanings");
        if (!(meanings instanceof List<?> meaningItems) || meaningItems.isEmpty()
            || !(meaningItems.get(0) instanceof Map<?, ?> meaning)) {
          System.err.println("[WordService] dictionary response missing meanings (attempt " + attempt + ")");
          return;
        }

        Object definitions = meaning.get("definitions");
        if (!(definitions instanceof List<?> definitionItems) || definitionItems.isEmpty()
            || !(definitionItems.get(0) instanceof Map<?, ?> definition)) {
          System.err.println("[WordService] dictionary response missing definitions (attempt " + attempt + ")");
          return;
        }

        if (isBlank(wordEntity.getMeaningEn()) && definition.get("definition") != null) {
          wordEntity.setMeaningEn(definition.get("definition").toString());
        }
        if (isBlank(wordEntity.getExampleEn()) && definition.get("example") != null) {
          wordEntity.setExampleEn(definition.get("example").toString());
        }

        return;
      } catch (Exception exception) {
        System.err
            .println("[WordService] dictionary lookup failed (attempt " + attempt + "): " + exception.getMessage());
        if (attempt < maxAttempts) {
          try {
            Thread.sleep(500);
          } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return;
          }
          continue;
        }
        return;
      }
    }
  }

  private String translateToJapanese(String text) {
    if (isBlank(text)) {
      return null;
    }
    if (deeplAuthKey.isBlank()) {
      System.err.println("[WordService] DEEPL_AUTH_KEY is not configured");
      return null;
    }

    try {
      Map<String, Object> response = webClient.post()
          .uri(deeplApiUrl)
          .header(HttpHeaders.AUTHORIZATION, "DeepL-Auth-Key " + deeplAuthKey)
          .contentType(MediaType.APPLICATION_JSON)
          .bodyValue(Map.of(
              "text", List.of(text),
              "source_lang", "EN",
              "target_lang", "JA"))
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
    } catch (WebClientResponseException exception) {
      System.err.println("[WordService] DeepL translation failed with HTTP "
          + exception.getStatusCode().value() + ": " + exception.getResponseBodyAsString());
    } catch (Exception exception) {
      System.err.println("[WordService] DeepL translation failed: " + exception.getMessage());
    }
    return null;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  /**
   * Fetch definition and example from Wordnik without saving.
   * Returns a map with keys "definition" and "example" (values may be null).
   */
  public Map<String, String> fetchFromWordnik(String word) {
    if (isBlank(word) || isBlank(wordnikApiKey)) {
      return Map.of("definition", null, "example", null);
    }

    try {
      List<Map<String, Object>> defs = webClient.get()
          .uri("https://api.wordnik.com/v4/word.json/" + word
              + "/definitions?limit=1&includeRelated=false&useCanonical=false&api_key=" + wordnikApiKey)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
          })
          .block();

      String def = null;
      if (defs != null && !defs.isEmpty() && defs.get(0).get("text") != null) {
        def = defs.get(0).get("text").toString();
      }

      Map<String, Object> examplesResp = webClient.get()
          .uri("https://api.wordnik.com/v4/word.json/" + word
              + "/examples?includeDuplicates=false&useCanonical=false&limit=1&api_key=" + wordnikApiKey)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
          })
          .block();

      String ex = null;
      if (examplesResp != null && examplesResp.get("examples") instanceof List<?> exList && !exList.isEmpty()) {
        Object ex0 = exList.get(0);
        if (ex0 instanceof Map<?, ?> exMap && exMap.get("text") != null) {
          ex = exMap.get("text").toString();
        }
      }

      return Map.of("definition", def, "example", ex);
    } catch (Exception e) {
      System.err.println("[WordService] Wordnik fetch failed: " + e.getMessage());
      return Map.of("definition", null, "example", null);
    }
  }
}