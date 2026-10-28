package com.example.backend.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

/** Gemini 呼び出しの共通窓口。機能ごとにクライアントを作らず、ここを使う */
@Component
public class GeminiApiClient {

  private static final Logger logger = LoggerFactory.getLogger(GeminiApiClient.class);

  private final ChatClient chatClient;

  public GeminiApiClient(ChatClient.Builder chatClientBuilder) {
    this.chatClient = chatClientBuilder.build();
  }

  /** プロンプトを送り、JSON の結果を指定した型にマッピングして受け取る */
  public <T> T generate(String prompt, Class<T> responseType) {
    T result;
    try {
      result = chatClient.prompt()
          .user(prompt)
          .call()
          .entity(responseType);
    } catch (RuntimeException e) {
      // 無料枠のレート制限や JSON のパース失敗。利用者には再試行を促す
      logger.warn("Gemini call failed: {}", e.getMessage());
      throw new ExternalApiException("AI の応答を取得できませんでした。少し待ってから再度お試しください。", e);
    }
    if (result == null) {
      throw new ExternalApiException("AI の応答が空でした。再度お試しください。", null);
    }
    return result;
  }
}
