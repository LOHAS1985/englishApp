package com.example.backend.common;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Pattern;

/**
 * Gemini 呼び出しの共通窓口。機能ごとにクライアントを作らず、ここを使う。
 * 無料枠のレート制限(429)や一時的な混雑(503 など)は、少し待って最大3回まで試す。1回の呼び出しには待ちの上限を設け、
 * 応答が返らないまま画面を待たせない(上限を超えたら、再試行を促すメッセージを返す)。
 */
@Component
public class GeminiApiClient {

  private static final Logger logger = LoggerFactory.getLogger(GeminiApiClient.class);

  /** 最大の試行回数(最初の1回を含む) */
  static final int MAX_ATTEMPTS = 3;
  /** 再試行の前に待つ時間(ms)。1回目の失敗のあと、2回目の失敗のあと */
  static final long[] BACKOFF_MS = { 1500, 4000 };
  /** 1回の呼び出しを待つ上限 */
  static final Duration CALL_TIMEOUT = Duration.ofSeconds(45);
  /** 再試行を含めた全体の上限。これを超えそうなら、次の試行はしない */
  static final Duration TOTAL_BUDGET = Duration.ofSeconds(90);

  /** 一時的な失敗とみなす応答(レート制限・サーバーの混雑・時間切れ) */
  private static final Pattern TRANSIENT = Pattern.compile(
      "\\b(429|500|502|503|504)\\b|RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|OVERLOADED|RATE.?LIMIT|TIMED? ?OUT",
      Pattern.CASE_INSENSITIVE);

  /** AI への送信。テストでは差し替える */
  interface Transport {
    <T> T entity(String prompt, Class<T> responseType);
  }

  /** 再試行の待ち。テストでは差し替える */
  interface Sleeper {
    void sleep(long millis) throws InterruptedException;
  }

  private final Transport transport;
  private final Sleeper sleeper;
  private final Duration callTimeout;
  private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

  @Autowired
  public GeminiApiClient(ChatClient.Builder chatClientBuilder) {
    ChatClient chatClient = chatClientBuilder.build();
    this.transport = new Transport() {
      @Override
      public <T> T entity(String prompt, Class<T> responseType) {
        return chatClient.prompt().user(prompt).call().entity(responseType);
      }
    };
    this.sleeper = Thread::sleep;
    this.callTimeout = CALL_TIMEOUT;
  }

  GeminiApiClient(Transport transport, Sleeper sleeper, Duration callTimeout) {
    this.transport = transport;
    this.sleeper = sleeper;
    this.callTimeout = callTimeout;
  }

  @PreDestroy
  void shutdown() {
    executor.shutdownNow();
  }

  /** プロンプトを送り、JSON の結果を指定した型にマッピングして受け取る */
  public <T> T generate(String prompt, Class<T> responseType) {
    long start = System.nanoTime();
    RuntimeException last = null;
    for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        T result = callWithTimeout(prompt, responseType);
        if (result == null) {
          throw new ExternalApiException("AI の応答が空でした。再度お試しください。", null);
        }
        return result;
      } catch (ExternalApiException e) {
        throw e;
      } catch (RuntimeException e) {
        last = e;
        logger.warn("Gemini call failed (attempt {}/{}): {}", attempt, MAX_ATTEMPTS, e.getMessage());
        if (attempt == MAX_ATTEMPTS || !isRetryable(e)) {
          break;
        }
        long wait = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
        Duration elapsed = Duration.ofNanos(System.nanoTime() - start);
        // 待ったあとに始める次の試行が、全体の上限を超えるなら、あきらめる
        if (elapsed.plusMillis(wait).compareTo(TOTAL_BUDGET) > 0) {
          break;
        }
        try {
          sleeper.sleep(wait);
        } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
          break;
        }
      }
    }
    // 無料枠のレート制限や JSON のパース失敗。利用者には再試行を促す
    throw new ExternalApiException("AI の応答を取得できませんでした。少し待ってから再度お試しください。", last);
  }

  /** 待ちの上限を超えたら、呼び出しを打ち切る(応答が返らないまま画面を待たせない) */
  private <T> T callWithTimeout(String prompt, Class<T> responseType) {
    Future<T> future = executor.submit(() -> transport.entity(prompt, responseType));
    try {
      return future.get(callTimeout.toMillis(), TimeUnit.MILLISECONDS);
    } catch (TimeoutException e) {
      future.cancel(true);
      throw new IllegalStateException("Gemini call timed out after " + callTimeout.toMillis() + "ms", e);
    } catch (InterruptedException e) {
      future.cancel(true);
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Gemini call interrupted", e);
    } catch (ExecutionException e) {
      Throwable cause = e.getCause() == null ? e : e.getCause();
      if (cause instanceof RuntimeException runtime) {
        throw runtime;
      }
      throw new IllegalStateException(cause.getMessage(), cause);
    }
  }

  /**
   * 少し待てば成功しうる失敗か。レート制限・サーバーの混雑・時間切れ・JSON の読み取り失敗(同じ依頼でも出力が変わる)。
   * 入力の誤りや認証の失敗(400・401・403 など)は、繰り返しても同じなので試さない。
   */
  static boolean isRetryable(Throwable error) {
    for (Throwable t = error; t != null; t = t.getCause() == t ? null : t.getCause()) {
      String name = t.getClass().getName().toLowerCase(Locale.ROOT);
      if (name.contains("serverexception") || name.contains("jsonprocessing") || name.contains("jackson")
          || name.contains("mismatchedinput") || name.contains("timeout")) {
        return true;
      }
      String message = t.getMessage();
      if (message != null && TRANSIENT.matcher(message).find()) {
        return true;
      }
    }
    return false;
  }
}
