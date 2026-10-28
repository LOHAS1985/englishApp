package com.example.backend.vocab;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Map;

/** DeepL API(無料版)で英語を日本語に翻訳する */
@Component
public class DeepLApiClient {

  private static final Logger logger = LoggerFactory.getLogger(DeepLApiClient.class);

  private final WebClient webClient = WebClient.create();
  private final String authKey;
  private final String apiUrl;

  public DeepLApiClient(@Value("${deepl.auth-key:}") String authKey,
      @Value("${deepl.api-url:https://api-free.deepl.com/v2/translate}") String apiUrl) {
    this.authKey = authKey;
    this.apiUrl = apiUrl;
  }

  /** 失敗時は null(必須かどうかは呼び出し側で判断する) */
  public String translateToJapanese(String text) {
    if (text == null || text.isBlank()) {
      return null;
    }
    if (authKey.isBlank()) {
      logger.warn("DEEPL_AUTH_KEY is not configured");
      return null;
    }

    try {
      Map<String, Object> response = webClient.post()
          .uri(apiUrl)
          .header(HttpHeaders.AUTHORIZATION, "DeepL-Auth-Key " + authKey)
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
    } catch (WebClientResponseException e) {
      logger.warn("DeepL translation failed with HTTP {}: {}", e.getStatusCode().value(),
          e.getResponseBodyAsString());
    } catch (Exception e) {
      logger.warn("DeepL translation failed: {}", e.getMessage());
    }
    return null;
  }
}
