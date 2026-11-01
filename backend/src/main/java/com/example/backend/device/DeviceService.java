package com.example.backend.device;

import com.example.backend.stats.StudyLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 端末登録。利用者は本人だけなので、API を使える端末を最大 {@code MAX_DEVICES}(既定3)台に絞る。
 * <ul>
 * <li>初回だけ合言葉(環境変数 APP_ACCESS_KEY)を入れて登録すると、その端末専用の鍵を発行する。画面はブラウザに保存し、
 * 以後のリクエストに X-Device-Token として付ける</li>
 * <li>上限まで登録済みなら、合言葉が正しくても登録できない(合言葉が漏れても新しい端末は使えない)</li>
 * <li>鍵はハッシュだけを保存する。登録済みの鍵はメモリにも持ち、毎回 DB を引かない(無料の DB は遅く、止まっていることもある)</li>
 * </ul>
 * APP_ACCESS_KEY が未設定なら保護しない(ローカル開発用)。
 */
@Service
public class DeviceService {

  private static final Logger logger = LoggerFactory.getLogger(DeviceService.class);

  /** 最終利用日時は、この間隔より古いときだけ更新する(リクエストのたびに DB に書かない) */
  static final Duration TOUCH_INTERVAL = Duration.ofMinutes(10);

  public record DeviceView(Long id, String name, LocalDateTime createdAt, LocalDateTime lastUsedAt,
      boolean current) {
  }

  public record Registration(String token, DeviceView device) {
  }

  /** 合言葉が違う(403) */
  public static class WrongKeyException extends RuntimeException {
    WrongKeyException() {
      super("合言葉が違います");
    }
  }

  /** 登録できる台数を超えた(409) */
  public static class DeviceLimitException extends RuntimeException {
    DeviceLimitException(int max) {
      super("登録できる端末は" + max + "台までです。登録済みの端末のマイページで、使わなくなった端末を削除してください");
    }
  }

  private final DeviceRepository repository;
  private final byte[] registrationKey;
  private final int maxDevices;
  private final SecureRandom random = new SecureRandom();
  /** 鍵のハッシュ → 端末ID。null なら次の認証時に DB から読み込む */
  private volatile Map<String, Long> cache;
  private final Map<Long, LocalDateTime> lastTouched = new ConcurrentHashMap<>();

  public DeviceService(DeviceRepository repository, @Value("${app.access-key:}") String registrationKey,
      @Value("${app.max-devices:3}") int maxDevices) {
    this.repository = repository;
    this.registrationKey = registrationKey.getBytes(StandardCharsets.UTF_8);
    this.maxDevices = maxDevices;
    if (registrationKey.isBlank()) {
      logger.warn("APP_ACCESS_KEY が未設定のため、API はだれでも呼び出せます(本番では設定してください)");
    }
  }

  public boolean enabled() {
    return registrationKey.length > 0;
  }

  public synchronized Registration register(String key, String name) {
    if (key == null || !MessageDigest.isEqual(registrationKey, key.getBytes(StandardCharsets.UTF_8))) {
      throw new WrongKeyException();
    }
    if (repository.count() >= maxDevices) {
      throw new DeviceLimitException(maxDevices);
    }
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    Device device = repository.save(new Device(cleanName(name), hash(token), LocalDateTime.now(StudyLogService.JST)));
    cache = null;
    logger.info("device registered: id={} name={}", device.getId(), device.getName());
    return new Registration(token, view(device, device.getId()));
  }

  /** 端末の鍵を確かめる。登録済みなら端末ID、そうでなければ null */
  public Long authenticate(String token) {
    if (token == null || token.isBlank()) {
      return null;
    }
    Map<String, Long> known = cache;
    if (known == null) {
      known = repository.findAll().stream()
          .collect(Collectors.toUnmodifiableMap(Device::getTokenHash, Device::getId));
      cache = known;
    }
    Long id = known.get(hash(token));
    if (id != null) {
      touch(id);
    }
    return id;
  }

  public List<DeviceView> list(Long currentId) {
    return repository.findAllByOrderByIdAsc().stream().map(d -> view(d, currentId)).toList();
  }

  public synchronized void delete(Long id) {
    if (!repository.existsById(id)) {
      throw new IllegalArgumentException("端末が見つかりません");
    }
    repository.deleteById(id);
    lastTouched.remove(id);
    cache = null;
    logger.info("device deleted: id={}", id);
  }

  private void touch(Long id) {
    LocalDateTime now = LocalDateTime.now(StudyLogService.JST);
    LocalDateTime last = lastTouched.get(id);
    if (last != null && last.plus(TOUCH_INTERVAL).isAfter(now)) {
      return;
    }
    lastTouched.put(id, now);
    // 画面の応答を待たせないよう、最終利用日時の更新は別スレッドで行う
    CompletableFuture.runAsync(() -> repository.findById(id).ifPresent(d -> {
      d.setLastUsedAt(now);
      repository.save(d);
    }));
  }

  private static DeviceView view(Device d, Long currentId) {
    return new DeviceView(d.getId(), d.getName(), d.getCreatedAt(), d.getLastUsedAt(),
        d.getId().equals(currentId));
  }

  static String cleanName(String name) {
    String n = name == null ? "" : name.strip();
    if (n.isEmpty()) {
      return "端末";
    }
    return n.length() > 100 ? n.substring(0, 100) : n;
  }

  static String hash(String token) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
          .digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
