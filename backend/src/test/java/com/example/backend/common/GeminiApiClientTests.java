package com.example.backend.common;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Gemini 呼び出しの再試行・待ちの上限(無料枠のレート制限や混雑で、すぐに失敗にしない) */
class GeminiApiClientTests {

  private final List<Long> sleeps = new ArrayList<>();
  private final AtomicInteger calls = new AtomicInteger();

  private GeminiApiClient client(GeminiApiClient.Transport transport) {
    return new GeminiApiClient(transport, sleeps::add, Duration.ofSeconds(5));
  }

  @Test
  void returnsTheResultWithoutRetrying() {
    GeminiApiClient client = client(new GeminiApiClient.Transport() {
      @Override
      public <T> T entity(String prompt, Class<T> type) {
        calls.incrementAndGet();
        return type.cast("ok");
      }
    });

    assertThat(client.generate("p", String.class)).isEqualTo("ok");
    assertThat(calls).hasValue(1);
    assertThat(sleeps).isEmpty();
  }

  @Test
  void retriesARateLimitAndSucceeds() {
    GeminiApiClient client = client(new GeminiApiClient.Transport() {
      @Override
      public <T> T entity(String prompt, Class<T> type) {
        if (calls.incrementAndGet() == 1) {
          throw new IllegalStateException("429 RESOURCE_EXHAUSTED: quota exceeded");
        }
        return type.cast("ok");
      }
    });

    assertThat(client.generate("p", String.class)).isEqualTo("ok");
    assertThat(calls).hasValue(2);
    assertThat(sleeps).containsExactly(GeminiApiClient.BACKOFF_MS[0]);
  }

  @Test
  void givesUpAfterThreeAttemptsWithAnUnderstandableMessage() {
    GeminiApiClient client = client(new GeminiApiClient.Transport() {
      @Override
      public <T> T entity(String prompt, Class<T> type) {
        calls.incrementAndGet();
        throw new IllegalStateException("503 UNAVAILABLE: The model is overloaded");
      }
    });

    assertThatThrownBy(() -> client.generate("p", String.class))
        .isInstanceOf(ExternalApiException.class)
        .hasMessageContaining("再度お試しください");
    assertThat(calls).hasValue(GeminiApiClient.MAX_ATTEMPTS);
    assertThat(sleeps).containsExactly(GeminiApiClient.BACKOFF_MS[0], GeminiApiClient.BACKOFF_MS[1]);
  }

  @Test
  void doesNotRetryAnInputOrAuthenticationError() {
    GeminiApiClient client = client(new GeminiApiClient.Transport() {
      @Override
      public <T> T entity(String prompt, Class<T> type) {
        calls.incrementAndGet();
        throw new IllegalArgumentException("400 INVALID_ARGUMENT: API key not valid");
      }
    });

    assertThatThrownBy(() -> client.generate("p", String.class)).isInstanceOf(ExternalApiException.class);
    assertThat(calls).hasValue(1);
    assertThat(sleeps).isEmpty();
  }

  @Test
  void anEmptyResponseIsAnErrorAndIsNotRetried() {
    GeminiApiClient client = client(new GeminiApiClient.Transport() {
      @Override
      public <T> T entity(String prompt, Class<T> type) {
        calls.incrementAndGet();
        return null;
      }
    });

    assertThatThrownBy(() -> client.generate("p", String.class))
        .isInstanceOf(ExternalApiException.class)
        .hasMessageContaining("空でした");
    assertThat(calls).hasValue(1);
  }

  @Test
  void aCallThatNeverReturnsIsCutOffAtTheTimeout() {
    GeminiApiClient client = new GeminiApiClient(new GeminiApiClient.Transport() {
      @Override
      public <T> T entity(String prompt, Class<T> type) {
        calls.incrementAndGet();
        try {
          Thread.sleep(60_000);
        } catch (InterruptedException e) {
          Thread.currentThread().interrupt();
        }
        return null;
      }
    }, sleeps::add, Duration.ofMillis(200));

    long start = System.nanoTime();
    assertThatThrownBy(() -> client.generate("p", String.class)).isInstanceOf(ExternalApiException.class);
    // 3回とも待ちの上限で打ち切る(60秒待たない)
    assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(10));
    assertThat(calls).hasValue(GeminiApiClient.MAX_ATTEMPTS);
  }

  @Test
  void classifiesTransientAndPermanentFailures() {
    assertThat(GeminiApiClient.isRetryable(new RuntimeException("HTTP 429 Too Many Requests"))).isTrue();
    assertThat(GeminiApiClient.isRetryable(new RuntimeException("wrapped", new RuntimeException("503 Service Unavailable"))))
        .isTrue();
    assertThat(GeminiApiClient.isRetryable(new RuntimeException("Read timed out"))).isTrue();
    assertThat(GeminiApiClient.isRetryable(new RuntimeException("400 Bad Request"))).isFalse();
    assertThat(GeminiApiClient.isRetryable(new RuntimeException("401 Unauthorized"))).isFalse();
    assertThat(GeminiApiClient.isRetryable(new RuntimeException("something else"))).isFalse();
  }
}
