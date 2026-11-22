package com.example.backend.listening;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 音声の作成: 外部プロセスの待ちの上限、同じ台本の同時依頼の共有 */
class TtsServiceTests {

  /** テスト用の外部プロセス(指定した秒数だけ眠る) */
  public static final class Sleeper {
    public static void main(String[] args) throws InterruptedException {
      System.out.println("started");
      Thread.sleep(Long.parseLong(args[0]) * 1000);
      System.out.println("finished");
    }
  }

  private static ProcessBuilder sleeper(long seconds) {
    String java = System.getProperty("java.home") + "/bin/java";
    return new ProcessBuilder(java, "-cp", System.getProperty("java.class.path"), Sleeper.class.getName(),
        String.valueOf(seconds));
  }

  @Test
  void aProcessThatFinishesReturnsItsOutput() throws Exception {
    TtsService.ProcessResult result = TtsService.runProcess(sleeper(0), Duration.ofSeconds(30));

    assertThat(result.exitCode()).isZero();
    assertThat(result.output()).contains("started").contains("finished");
  }

  @Test
  void aProcessThatNeverFinishesIsKilledAtTheTimeout() {
    long start = System.nanoTime();

    assertThatThrownBy(() -> TtsService.runProcess(sleeper(120), Duration.ofSeconds(2)))
        .isInstanceOf(IOException.class)
        .hasMessageContaining("timed out");

    // 120秒待たずに打ち切る
    assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(30));
  }

  @Test
  void theCacheKeyDependsOnTheScriptAndIsStable() {
    assertThat(TtsService.cacheKey("Man: Hello.")).isEqualTo(TtsService.cacheKey("Man: Hello.")).hasSize(40);
    assertThat(TtsService.cacheKey("Man: Hello.")).isNotEqualTo(TtsService.cacheKey("Man: Hello!"));
  }

  @Test
  void simultaneousRequestsForTheSameScriptShareOneJob() throws Exception {
    AtomicInteger runs = new AtomicInteger();
    CountDownLatch release = new CountDownLatch(1);
    TtsService service = new TtsService(new SimpleMeterRegistry()) {
      @Override
      Map<String, Object> synthesize(String dialog, String base) throws InterruptedException {
        runs.incrementAndGet();
        release.await(10, TimeUnit.SECONDS);
        return Map.of("audioUrl", "/audio/generated/" + base + ".mp3");
      }
    };
    try {
      CompletableFuture<Map<String, Object>> first = service.synthesizeAsync("Man: Hi.", "l1");
      CompletableFuture<Map<String, Object>> second = service.synthesizeAsync("Man: Hi.", "l1");
      // 別の台本は別に作る
      CompletableFuture<Map<String, Object>> other = service.synthesizeAsync("Woman: Bye.", "l2");

      release.countDown();

      assertThat(first.get(10, TimeUnit.SECONDS)).containsEntry("audioUrl", "/audio/generated/l1.mp3");
      assertThat(second.get(10, TimeUnit.SECONDS)).isEqualTo(first.get());
      assertThat(other.get(10, TimeUnit.SECONDS)).containsEntry("audioUrl", "/audio/generated/l2.mp3");
      assertThat(runs).hasValue(2);

      // 終わったあとの依頼は、改めて作る(作成中の記録は残らない)
      service.synthesizeAsync("Man: Hi.", "l1").get(10, TimeUnit.SECONDS);
      assertThat(runs).hasValue(3);
    } finally {
      service.shutdownExecutor();
    }
  }

  @Test
  void aFailedJobIsSharedAndThenForgotten() throws Exception {
    AtomicInteger runs = new AtomicInteger();
    TtsService service = new TtsService(new SimpleMeterRegistry()) {
      @Override
      Map<String, Object> synthesize(String dialog, String base) throws IOException {
        runs.incrementAndGet();
        throw new IOException("tts failed");
      }
    };
    try {
      assertThatThrownBy(() -> service.synthesizeAsync("Man: Hi.", "l1").get(10, TimeUnit.SECONDS))
          .hasRootCauseMessage("tts failed");
      // 失敗は残さない。次の依頼は改めて試す
      assertThatThrownBy(() -> service.synthesizeAsync("Man: Hi.", "l1").get(10, TimeUnit.SECONDS))
          .hasRootCauseMessage("tts failed");
      assertThat(runs).hasValue(2);
    } finally {
      service.shutdownExecutor();
    }
  }
}
