package com.example.backend.accesslog;

import com.example.backend.accesslog.AccessLogService.IpSummary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * アクセス履歴の閲覧(マイページ)と週次レポート(GitHub Actions がメール送信)。
 * IP を含むため、環境変数 ACCESS_LOG_KEY と同じ値を X-Access-Log-Key ヘッダーで送ったときだけ返す。
 * キーが未設定なら常に拒否する。
 */
@RestController
@RequestMapping("/api/access-logs")
public class AccessLogController {

  private static final int MAX_DAYS = 90;

  public record AccessLogView(LocalDateTime createdAt, String ip, String method, String path, String device,
      String country, String region, String city, String isp) {
  }

  public record AccessLogResponse(int days, int total, List<IpSummary> summaries, List<AccessLogView> recent) {
  }

  private final AccessLogService accessLogService;
  private final String accessKey;

  public AccessLogController(AccessLogService accessLogService,
      @Value("${access-log.key:}") String accessKey) {
    this.accessLogService = accessLogService;
    this.accessKey = accessKey;
  }

  @GetMapping
  public ResponseEntity<?> list(@RequestHeader(value = "X-Access-Log-Key", required = false) String key,
      @RequestParam(defaultValue = "7") int days) {
    if (!authorized(key)) {
      return forbidden();
    }
    int d = clampDays(days);
    List<AccessLog> logs = accessLogService.recent(d);
    List<AccessLogView> recent = logs.stream().limit(100)
        .map(l -> new AccessLogView(l.getCreatedAt(), l.getIp(), l.getMethod(), l.getPath(),
            AccessLogService.describeDevice(l.getUserAgent()), l.getCountry(), l.getRegion(), l.getCity(),
            l.getIsp()))
        .toList();
    return ResponseEntity.ok(new AccessLogResponse(d, logs.size(), accessLogService.summarize(logs), recent));
  }

  @GetMapping(value = "/report", produces = MediaType.TEXT_PLAIN_VALUE + ";charset=UTF-8")
  public ResponseEntity<?> report(@RequestHeader(value = "X-Access-Log-Key", required = false) String key,
      @RequestParam(defaultValue = "7") int days) {
    if (!authorized(key)) {
      return forbidden();
    }
    return ResponseEntity.ok(accessLogService.report(clampDays(days)));
  }

  private boolean authorized(String key) {
    if (accessKey.isBlank() || key == null) {
      return false;
    }
    return MessageDigest.isEqual(accessKey.getBytes(StandardCharsets.UTF_8), key.getBytes(StandardCharsets.UTF_8));
  }

  private ResponseEntity<?> forbidden() {
    return ResponseEntity.status(403).contentType(MediaType.APPLICATION_JSON).body(Map.of("error",
        accessKey.isBlank() ? "サーバーに閲覧キー(ACCESS_LOG_KEY)が設定されていません" : "閲覧キーが違います"));
  }

  private static int clampDays(int days) {
    return Math.max(1, Math.min(days, MAX_DAYS));
  }
}
