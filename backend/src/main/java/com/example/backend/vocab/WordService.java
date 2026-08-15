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
      if ((w.getMeaningEn() == null || w.getMeaningEn().isBlank())
          || (w.getExampleEn() == null || w.getExampleEn().isBlank())) {
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

    // translate to Japanese using LibreTranslate (try multiple instances as fallback)
    try {
      if (w.getMeaningEn() != null && !w.getMeaningEn().isBlank()) {
        String t = tryTranslateWithFallback(w.getMeaningEn());
        if (t != null) w.setMeaningJa(t);
        else System.err.println("[WordService] failed to translate meaningEn for: " + word);
      }

      if (w.getExampleEn() != null && !w.getExampleEn().isBlank()) {
        String t2 = tryTranslateWithFallback(w.getExampleEn());
        if (t2 != null) w.setExampleJa(t2);
        else System.err.println("[WordService] failed to translate exampleEn for: " + word);
      }
    } catch (Exception e) {
      System.err.println("[WordService] translation error for " + word + ": " + e.getMessage());
    }

    return repo.save(w);
  }

  private String tryTranslateWithFallback(String text) {
    String[] endpoints = new String[] {
        "https://libretranslate.com/translate",
        "https://translate.argosopentech.com/translate",
        "https://libretranslate.de/translate"
    };
    for (String ep : endpoints) {
      try {
        Map<String, Object> resp = webClient.post()
            .uri(ep)
            .header("Content-Type", "application/json")
            .bodyValue(Map.of("q", text, "source", "en", "target", "ja"))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .block();
        if (resp != null) {
          Object tr = resp.get("translatedText");
          if (tr != null) return tr.toString();
          // some instances return 'translation' or 'translated_text'
          if (resp.get("translation") != null) return resp.get("translation").toString();
          if (resp.get("translated_text") != null) return resp.get("translated_text").toString();
        }
      } catch (Exception ex) {
        System.err.println("[WordService] translate failed on " + ep + ": " + ex.getMessage());
      }
    }
    return null;
  }
}
