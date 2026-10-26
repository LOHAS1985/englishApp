package com.example.backend.accesslog;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/** アクセスの記録(地域の推定は応答を待たせないよう別スレッドで行う)と、閲覧・週次レポート用の集計 */
@Service
public class AccessLogService {

  private static final Logger logger = LoggerFactory.getLogger(AccessLogService.class);
  private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  /** IP ごとの集計。画面と週次メールで使う */
  public record IpSummary(
      String ip,
      long count,
      LocalDateTime firstSeen,
      LocalDateTime lastSeen,
      String devices,
      String country,
      String region,
      String city,
      String isp) {
  }

  private final AccessLogRepository repository;
  private final GeoIpService geoIpService;
  private final int retentionDays;
  private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
    Thread t = new Thread(r, "access-log");
    t.setDaemon(true);
    return t;
  });

  public AccessLogService(AccessLogRepository repository, GeoIpService geoIpService,
      @Value("${access-log.retention-days:90}") int retentionDays) {
    this.repository = repository;
    this.geoIpService = geoIpService;
    this.retentionDays = retentionDays;
  }

  public void record(String ip, String method, String path, String userAgent) {
    LocalDateTime now = LocalDateTime.now();
    executor.execute(() -> {
      try {
        repository.save(new AccessLog(now, ip, method, truncate(path, 255), truncate(userAgent, 500),
            geoIpService.lookup(ip)));
      } catch (Exception e) {
        logger.warn("failed to save access log: {}", e.getMessage());
      }
    });
  }

  /** 保存期間を過ぎた記録を毎日 4:00 に削除する */
  @Scheduled(cron = "0 0 4 * * *")
  public void deleteExpired() {
    long deleted = repository.deleteByCreatedAtBefore(LocalDateTime.now().minusDays(retentionDays));
    if (deleted > 0) {
      logger.info("deleted {} expired access logs", deleted);
    }
  }

  public List<AccessLog> recent(int days) {
    return repository.findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime.now().minusDays(days));
  }

  public List<IpSummary> summarize(List<AccessLog> logs) {
    Map<String, List<AccessLog>> byIp = logs.stream()
        .collect(Collectors.groupingBy(AccessLog::getIp, LinkedHashMap::new, Collectors.toList()));
    List<IpSummary> result = new ArrayList<>();
    byIp.forEach((ip, list) -> {
      AccessLog latest = list.stream().max(Comparator.comparing(AccessLog::getCreatedAt)).orElseThrow();
      LocalDateTime first = list.stream().map(AccessLog::getCreatedAt).min(Comparator.naturalOrder()).orElseThrow();
      String devices = list.stream().map(l -> describeDevice(l.getUserAgent())).distinct()
          .collect(Collectors.joining(" / "));
      result.add(new IpSummary(ip, list.size(), first, latest.getCreatedAt(), devices,
          latest.getCountry(), latest.getRegion(), latest.getCity(), latest.getIsp()));
    });
    result.sort(Comparator.comparing(IpSummary::lastSeen).reversed());
    return result;
  }

  /** 週次メールの本文(プレーンテキスト) */
  public String report(int days) {
    List<AccessLog> logs = recent(days);
    List<IpSummary> summaries = summarize(logs);
    StringBuilder sb = new StringBuilder();
    sb.append("英語学習アプリ アクセスレポート(直近").append(days).append("日)\n");
    sb.append("作成: ").append(LocalDateTime.now().format(TIME)).append("\n\n");
    sb.append("アクセス数: ").append(logs.size()).append(" 件 / 接続元: ").append(summaries.size()).append(" 件\n");
    if (summaries.isEmpty()) {
      sb.append("\nこの期間のアクセスはありませんでした。\n");
    }
    for (IpSummary s : summaries) {
      sb.append("\n■ ").append(s.ip()).append("(").append(s.count()).append(" 回)\n");
      sb.append("  地域: ").append(place(s)).append("\n");
      sb.append("  回線: ").append(Objects.requireNonNullElse(s.isp(), "不明")).append("\n");
      sb.append("  端末: ").append(s.devices()).append("\n");
      sb.append("  期間: ").append(s.firstSeen().format(TIME)).append(" 〜 ").append(s.lastSeen().format(TIME))
          .append("\n");
    }
    sb.append("\n※ サーバーが再起動するとそれ以前の記録は残りません(本番DBが未設定の場合)。\n");
    return sb.toString();
  }

  private static String place(IpSummary s) {
    String joined = java.util.stream.Stream.of(s.country(), s.region(), s.city())
        .filter(Objects::nonNull).distinct().collect(Collectors.joining(" "));
    return joined.isEmpty() ? "不明" : joined;
  }

  /** User-Agent から「iPhone / Safari」のような短い表記を作る */
  static String describeDevice(String userAgent) {
    if (userAgent == null || userAgent.isBlank()) {
      return "不明";
    }
    String ua = userAgent;
    String os = ua.contains("iPhone") ? "iPhone"
        : ua.contains("iPad") ? "iPad"
        : ua.contains("Android") ? "Android"
        : ua.contains("Windows") ? "Windows"
        : ua.contains("Mac OS X") || ua.contains("Macintosh") ? "Mac"
        : ua.contains("Linux") ? "Linux"
        : null;
    String browser = ua.contains("Edg/") ? "Edge"
        : ua.contains("OPR/") ? "Opera"
        : ua.contains("Chrome/") || ua.contains("CriOS/") ? "Chrome"
        : ua.contains("Firefox/") || ua.contains("FxiOS/") ? "Firefox"
        : ua.contains("Safari/") ? "Safari"
        : null;
    if (os == null && browser == null) {
      // curl や監視ツールなど。先頭の名前だけ残す
      return truncate(ua.split("[ /]")[0], 40);
    }
    return Objects.requireNonNullElse(os, "不明") + " / " + Objects.requireNonNullElse(browser, "不明");
  }

  private static String truncate(String value, int max) {
    return value == null || value.length() <= max ? value : value.substring(0, max);
  }

  @PreDestroy
  void shutdown() {
    executor.shutdown();
  }
}
