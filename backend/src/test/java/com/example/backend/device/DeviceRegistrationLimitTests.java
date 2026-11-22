package com.example.backend.device;

import com.example.backend.device.DeviceService.DeviceLimitException;
import com.example.backend.device.DeviceService.TooManyAttemptsException;
import com.example.backend.device.DeviceService.WrongKeyException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** 合言葉の総当たり対策(連続で間違えたらロック)と、上限到達時の応答、削除した端末のキャッシュ */
class DeviceRegistrationLimitTests {

  private final DeviceRepository repository = mock(DeviceRepository.class);
  private final List<Device> stored = new ArrayList<>();
  private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-11-22T00:00:00Z"));
  private DeviceService service;

  @BeforeEach
  void wire() {
    when(repository.count()).thenAnswer(i -> (long) stored.size());
    when(repository.save(any(Device.class))).thenAnswer(i -> {
      Device d = i.getArgument(0);
      // DB が付ける ID の代わり
      try {
        var field = Device.class.getDeclaredField("id");
        field.setAccessible(true);
        field.set(d, (long) stored.size() + 1);
      } catch (ReflectiveOperationException e) {
        throw new IllegalStateException(e);
      }
      stored.add(d);
      return d;
    });
    when(repository.findAll()).thenAnswer(i -> List.copyOf(stored));
    when(repository.existsById(anyLong())).thenReturn(true);
    when(repository.findById(anyLong())).thenReturn(Optional.empty());
    service = new DeviceService(repository, "secret-words", 2);
    service.setClock(new Clock() {
      @Override
      public java.time.ZoneId getZone() {
        return ZoneOffset.UTC;
      }

      @Override
      public Clock withZone(java.time.ZoneId zone) {
        return this;
      }

      @Override
      public Instant instant() {
        return now.get();
      }
    });
  }

  private void wrongKeyTimes(int times) {
    for (int i = 0; i < times; i++) {
      assertThatThrownBy(() -> service.register("wrong", "PC")).isInstanceOf(WrongKeyException.class);
    }
  }

  @Test
  void lockedAfterFiveWrongKeysEvenForTheRightKey() {
    wrongKeyTimes(DeviceService.MAX_FAILED_ATTEMPTS);

    // ロック中は、正しい合言葉でも受け付けない
    assertThatThrownBy(() -> service.register("secret-words", "PC")).isInstanceOf(TooManyAttemptsException.class);
    assertThatThrownBy(() -> service.register("wrong", "PC")).isInstanceOf(TooManyAttemptsException.class);
    assertThat(stored).isEmpty();
  }

  @Test
  void lockEndsAfterTheLockDuration() {
    wrongKeyTimes(DeviceService.MAX_FAILED_ATTEMPTS);

    now.set(now.get().plus(DeviceService.LOCK_DURATION).plusSeconds(1));

    assertThat(service.register("secret-words", "PC").token()).isNotBlank();
  }

  @Test
  void aSuccessfulRegistrationResetsTheFailureCount() {
    wrongKeyTimes(DeviceService.MAX_FAILED_ATTEMPTS - 1);
    service.register("secret-words", "PC");

    // 成功したので数え直し。もう4回間違えてもロックされない
    wrongKeyTimes(DeviceService.MAX_FAILED_ATTEMPTS - 1);
    assertThat(service.register("secret-words", "iPhone").token()).isNotBlank();
  }

  @Test
  void atTheLimitTheResponseIsTheSameWhetherOrNotTheKeyIsRight() {
    service.register("secret-words", "PC");
    service.register("secret-words", "iPhone");

    // 合言葉が正しいかどうかを、応答の違いから確かめられない
    assertThatThrownBy(() -> service.register("secret-words", "X")).isInstanceOf(DeviceLimitException.class);
    assertThatThrownBy(() -> service.register("wrong", "X")).isInstanceOf(DeviceLimitException.class);
    // 上限に達している間の間違いは、ロックの回数に数えない
    wrongKeyTimesIgnoringLimit(10);
  }

  private void wrongKeyTimesIgnoringLimit(int times) {
    for (int i = 0; i < times; i++) {
      assertThatThrownBy(() -> service.register("wrong", "X")).isInstanceOf(DeviceLimitException.class);
    }
  }

  @Test
  void aDeletedDeviceCannotComeBackFromAStaleCache() {
    String token = service.register("secret-words", "PC").token();
    assertThat(service.authenticate(token)).isNotNull();

    Device registered = stored.get(0);
    stored.clear();
    service.delete(registered.getId());

    // 削除したあとの認証は、DB の最新の状態(空)で確かめる
    assertThat(service.authenticate(token)).isNull();
  }
}
