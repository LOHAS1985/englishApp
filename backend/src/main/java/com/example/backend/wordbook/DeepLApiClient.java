package com.example.backend.wordbook;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/** DeepL API(無料版)で英語を日本語に翻訳する。応答の待ちは {@link #REQUEST_TIMEOUT} で打ち切る */
@Component
public class DeepLApiClient {

  private static final Logger logger = LoggerFactory.getLogger(DeepLApiClient.class);

  /** 応答がない(接続は開いたまま返ってこない)ときに待つ上限。超えたら翻訳できなかったものとして次へ進む */
  static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(20);

  private final RestClient restClient;
  private final String authKey;
  private final String apiUrl;

  @Autowired
  public DeepLApiClient(@Value("${deepl.auth-key:}") String authKey,
      @Value("${deepl.api-url:https://api-free.deepl.com/v2/translate}") String apiUrl) {
    this(authKey, apiUrl, RestClient.builder()
        .requestFactory(new JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .connectTimeout(REQUEST_TIMEOUT)
            .build()))
        .build());
  }

  /** テスト用。通信部分を差し替えられるようにする */
  DeepLApiClient(String authKey, String apiUrl, RestClient restClient) {
    this.authKey = authKey;
    this.apiUrl = apiUrl;
    this.restClient = restClient;
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
      Map<String, Object> response = restClient.post()
          .uri(apiUrl)
          .header(HttpHeaders.AUTHORIZATION, "DeepL-Auth-Key " + authKey)
          .contentType(MediaType.APPLICATION_JSON)
          .body(Map.of(
              "text", List.of(text),
              "source_lang", "EN",
              "target_lang", "JA"))
          .retrieve()
          .body(new ParameterizedTypeReference<Map<String, Object>>() {
          });

      Object translations = response == null ? null : response.get("translations");
      if (translations instanceof List<?> translationItems && !translationItems.isEmpty()
          && translationItems.get(0) instanceof Map<?, ?> translation) {
        Object translatedText = translation.get("text");
        return translatedText == null ? null : translatedText.toString();
      }
    } catch (RestClientResponseException e) {
      logger.warn("DeepL translation failed with HTTP {}: {}", e.getStatusCode().value(),
          e.getResponseBodyAsString());
    } catch (Exception e) {
      logger.warn("DeepL translation failed: {}", e.getMessage());
    }
    return null;
  }
}
