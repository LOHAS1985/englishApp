package com.example.backend.vocab;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

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
    Word w = new Word(word);

    // call dictionaryapi.dev
    try {
      String dictUrl = "https://api.dictionaryapi.dev/api/v2/entries/en/" + word;
      List<Map<String,Object>> response = webClient.get()
          .uri(dictUrl)
          .retrieve()
          .bodyToMono(List.class)
          .block();

      if (response != null && !response.isEmpty()) {
        Map<String,Object> first = response.get(0);
        List<Map<String,Object>> meanings = (List<Map<String,Object>>) first.get("meanings");
        if (meanings != null && !meanings.isEmpty()) {
          Map<String,Object> m = meanings.get(0);
          List<Map<String,Object>> defs = (List<Map<String,Object>>) m.get("definitions");
          if (defs != null && !defs.isEmpty()) {
            Map<String,Object> def = defs.get(0);
            Object defText = def.get("definition");
            Object example = def.get("example");
            if (defText != null) w.setMeaningEn(defText.toString());
            if (example != null) w.setExampleEn(example.toString());
          }
        }
      }
    } catch (Exception e) {
      // ignore and continue
    }

    // translate to Japanese using LibreTranslate public instance
    try {
      if (w.getMeaningEn() != null && !w.getMeaningEn().isBlank()) {
        Map<String,Object> resp = webClient.post()
            .uri("https://libretranslate.com/translate")
            .header("Content-Type","application/json")
            .bodyValue(Map.of("q", w.getMeaningEn(), "source", "en", "target", "ja"))
            .retrieve()
            .bodyToMono(Map.class)
            .block();
        if (resp != null && resp.get("translatedText") != null) {
          w.setMeaningJa(resp.get("translatedText").toString());
        }
      }

      if (w.getExampleEn() != null && !w.getExampleEn().isBlank()) {
        Map<String,Object> resp2 = webClient.post()
            .uri("https://libretranslate.com/translate")
            .header("Content-Type","application/json")
            .bodyValue(Map.of("q", w.getExampleEn(), "source", "en", "target", "ja"))
            .retrieve()
            .bodyToMono(Map.class)
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
