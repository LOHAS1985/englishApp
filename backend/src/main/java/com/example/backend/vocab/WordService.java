package com.example.backend.vocab;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.core.ParameterizedTypeReference;

import java.util.List;
import java.util.Map;

@Service
public class WordService {

  private final WordRepository repo;
  private final WebClient webClient = WebClient.create();

  public WordService(WordRepository repo) {
    this.repo = repo;
  }

  public Word fetchAndSave(String word) {
    return fetchAndSave(word, null, null);
  }

  public Word fetchAndSave(String word, String meaningEnOverride, String exampleEnOverride) {
    Word w = new Word(word);

    // if overrides provided, use them first
    if (meaningEnOverride != null && !meaningEnOverride.isBlank()) {
      w.setMeaningEn(meaningEnOverride);
    }
    if (exampleEnOverride != null && !exampleEnOverride.isBlank()) {
      w.setExampleEn(exampleEnOverride);
    }

    // call dictionaryapi.dev only if no meaning/example provided
    try {
      if ((w.getMeaningEn() == null || w.getMeaningEn().isBlank()) || (w.getExampleEn() == null || w.getExampleEn().isBlank())) {
        String dictUrl = "https://api.dictionaryapi.dev/api/v2/entries/en/" + word;
        List<Map<String, Object>> response = webClient.get()
            .uri(dictUrl)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
            })
            .block();

        if (response != null && !response.isEmpty()) {
          Map<String, Object> first = response.get(0);
          Object meaningsObj = first.get("meanings");
          if (meaningsObj instanceof List) {
            List<?> meanings = (List<?>) meaningsObj;
            if (!meanings.isEmpty() && meanings.get(0) instanceof Map) {
              Map<?, ?> m = (Map<?, ?>) meanings.get(0);
              Object defsObj = m.get("definitions");
              if (defsObj instanceof List) {
                List<?> defs = (List<?>) defsObj;
                if (!defs.isEmpty() && defs.get(0) instanceof Map) {
                  Map<?, ?> def = (Map<?, ?>) defs.get(0);
                  Object defText = def.get("definition");
                  Object example = def.get("example");
                  if (defText != null && (w.getMeaningEn() == null || w.getMeaningEn().isBlank()))
                    w.setMeaningEn(defText.toString());
                  if (example != null && (w.getExampleEn() == null || w.getExampleEn().isBlank()))
                    w.setExampleEn(example.toString());
                }
              }
            }
          }
        }
      }
    } catch (Exception e) {
      // ignore and continue
    }

    // translate to Japanese using LibreTranslate public instance
    try {
      if (w.getMeaningEn() != null && !w.getMeaningEn().isBlank()) {
        Map<String, Object> resp = webClient.post()
            .uri("https://libretranslate.com/translate")
            .header("Content-Type", "application/json")
            .bodyValue(Map.of("q", w.getMeaningEn(), "source", "en", "target", "ja"))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
            })
            .block();
        if (resp != null && resp.get("translatedText") != null) {
          w.setMeaningJa(resp.get("translatedText").toString());
        }
      }

      if (w.getExampleEn() != null && !w.getExampleEn().isBlank()) {
        Map<String, Object> resp2 = webClient.post()
            .uri("https://libretranslate.com/translate")
            .header("Content-Type", "application/json")
            .bodyValue(Map.of("q", w.getExampleEn(), "source", "en", "target", "ja"))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
            })
            .block();
        if (resp2 != null && resp2.get("translatedText") != null) {
          w.setExampleJa(resp2.get("translatedText").toString());
        }
      }
    } catch (Exception e) {
      // ignore translation errors
    }

    return repo.save(w);
  }
}
