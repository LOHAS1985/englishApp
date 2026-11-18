package com.example.backend.common;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class SignatureCacheTests {

  @Test
  void reusesTheResultWhileTheSignatureIsTheSame() {
    SignatureCache<String> cache = new SignatureCache<>();
    AtomicInteger calls = new AtomicInteger();

    String first = cache.get(List.of(1L, 10L), () -> "v" + calls.incrementAndGet());
    String second = cache.get(List.of(1L, 10L), () -> "v" + calls.incrementAndGet());

    assertThat(first).isEqualTo("v1");
    assertThat(second).isEqualTo("v1");
    assertThat(calls).hasValue(1);
  }

  @Test
  void recomputesWhenTheSignatureChanges() {
    SignatureCache<String> cache = new SignatureCache<>();
    AtomicInteger calls = new AtomicInteger();

    cache.get(List.of(1L, 10L), () -> "v" + calls.incrementAndGet());
    String changed = cache.get(List.of(1L, 11L), () -> "v" + calls.incrementAndGet());
    // 元の印に戻っても、保持しているのは直近の1件だけなので計算し直す(古い結果を返さない)
    String back = cache.get(List.of(1L, 10L), () -> "v" + calls.incrementAndGet());

    assertThat(changed).isEqualTo("v2");
    assertThat(back).isEqualTo("v3");
  }

  @Test
  void doesNotKeepAResultWhenTheComputationFails() {
    SignatureCache<String> cache = new SignatureCache<>();

    try {
      cache.get("a", () -> {
        throw new IllegalStateException("db is down");
      });
    } catch (IllegalStateException expected) {
      // 失敗した結果は残さず、次の呼び出しでやり直す
    }

    assertThat(cache.get("a", () -> "ok")).isEqualTo("ok");
  }
}
