package com.example.backend.accesslog;

import com.example.backend.common.AppState;
import com.example.backend.common.AppStateRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** アクセスログの古い記録の削除(1日1回・起動時にも)と、大量のアクセスでも待ちの列が増え続けないこと */
class AccessLogServiceTests {

  private final AccessLogRepository repository = mock(AccessLogRepository.class);
  private final GeoIpService geo = mock(GeoIpService.class);
  private final AppStateRepository states = mock(AppStateRepository.class);

  @Test
  void deletesRecordsOlderThanTheRetentionOnceADay() {
    AccessLogService service = new AccessLogService(repository, geo, states, 90);
    LocalDate today = LocalDate.of(2026, 11, 22);
    when(states.findById(AccessLogService.CLEANUP_STATE_KEY)).thenReturn(Optional.empty());
    when(repository.deleteByCreatedAtBefore(any())).thenReturn(3L);

    service.deleteExpiredIfDue(today);

    // 90日より前(2026-08-24 より前)の記録を消す
    verify(repository).deleteByCreatedAtBefore(LocalDate.of(2026, 8, 24).atStartOfDay());
    verify(states).save(any(AppState.class));

    // 同じ日の2回目(起動のあとの定期実行)は何もしない
    when(states.findById(AccessLogService.CLEANUP_STATE_KEY))
        .thenReturn(Optional.of(new AppState(AccessLogService.CLEANUP_STATE_KEY, "2026-11-22")));
    service.deleteExpiredIfDue(today);
    verify(repository, times(1)).deleteByCreatedAtBefore(any());

    // 翌日はまた行う
    service.deleteExpiredIfDue(today.plusDays(1));
    verify(repository, times(2)).deleteByCreatedAtBefore(any());
  }

  @Test
  void aFailedDeletionIsRetriedNextTimeAndDoesNotStopTheApp() {
    AccessLogService service = new AccessLogService(repository, geo, states, 90);
    when(states.findById(AccessLogService.CLEANUP_STATE_KEY)).thenReturn(Optional.empty());
    when(repository.deleteByCreatedAtBefore(any())).thenThrow(new IllegalStateException("db down"));

    assertThatCode(() -> service.deleteExpiredIfDue(LocalDate.of(2026, 11, 22))).doesNotThrowAnyException();

    // 実行した日として記録しない(次の機会に、もう一度試す)
    verify(states, never()).save(any(AppState.class));
  }

  @Test
  void aFloodOfRequestsDropsTheOverflowInsteadOfQueueingWithoutLimit() throws Exception {
    CountDownLatch release = new CountDownLatch(1);
    CountDownLatch started = new CountDownLatch(1);
    when(geo.lookup(any())).thenAnswer(i -> {
      started.countDown();
      release.await(10, TimeUnit.SECONDS);
      return GeoIpService.Geo.UNKNOWN;
    });
    AccessLogService service = new AccessLogService(repository, geo, states, 90);
    try {
      service.record("203.0.113.1", "GET", "/api/level", "ua");
      assertThat(started.await(5, TimeUnit.SECONDS)).isTrue();

      // 保存が止まっている間に、上限の倍のアクセスが来ても、例外にならず、呼び出しも待たされない
      long start = System.nanoTime();
      assertThatCode(() -> {
        for (int i = 0; i < AccessLogService.QUEUE_LIMIT * 2; i++) {
          service.record("203.0.113." + (i % 250), "GET", "/api/level", "ua");
        }
      }).doesNotThrowAnyException();
      assertThat(TimeUnit.NANOSECONDS.toSeconds(System.nanoTime() - start)).isLessThan(5);

      release.countDown();
      // 保存されたのは、実行中の1件と、待ちの列に入れた分まで(あふれた分は捨てた)
      Thread.sleep(500);
      verify(repository, org.mockito.Mockito.atMost(AccessLogService.QUEUE_LIMIT + 1))
          .save(any(AccessLog.class));
    } finally {
      release.countDown();
      service.shutdown();
    }
  }

  @Test
  void failedGeoLookupsAreNotRepeatedImmediately() {
    int[] calls = { 0 };
    GeoIpService service = new GeoIpService(tools.jackson.databind.json.JsonMapper.builder().build()) {
      @Override
      Geo fetch(String ip) {
        calls[0]++;
        return Geo.UNKNOWN;
      }
    };

    service.lookup("203.0.113.9");
    service.lookup("203.0.113.9");
    service.lookup("203.0.113.9");

    // 失敗した IP は、しばらく問い合わせ直さない(ip-api の無料枠の制限に当たって止められないように)
    assertThat(calls[0]).isEqualTo(1);
  }
}
