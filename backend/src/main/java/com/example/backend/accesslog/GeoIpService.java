package com.example.backend.accesslog;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * IP アドレスから国・地域・回線事業者を推定する。ip-api.com の無料 API(非商用・毎分45回まで)を使い、
 * 結果は IP ごとにメモリへキャッシュする。失敗しても空の結果を返すだけで、アクセス記録自体は残す。
 */
@Service
public class GeoIpService {

  private static final Logger logger = LoggerFactory.getLogger(GeoIpService.class);
  private static final int CACHE_LIMIT = 5000;

  public record Geo(String country, String region, String city, String isp) {
    static final Geo UNKNOWN = new Geo(null, null, null, null);
    static final Geo PRIVATE = new Geo("ローカル", null, null, null);
  }

  private final JsonMapper jsonMapper;
  private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
  private final Map<String, Geo> cache = new ConcurrentHashMap<>();

  public GeoIpService(JsonMapper jsonMapper) {
    this.jsonMapper = jsonMapper;
  }

  public Geo lookup(String ip) {
    if (isPrivate(ip)) {
      return Geo.PRIVATE;
    }
    Geo cached = cache.get(ip);
    if (cached != null) {
      return cached;
    }
    Geo geo = fetch(ip);
    if (geo != Geo.UNKNOWN) {
      if (cache.size() >= CACHE_LIMIT) {
        cache.clear();
      }
      cache.put(ip, geo);
    }
    return geo;
  }

  private Geo fetch(String ip) {
    try {
      // 無料版は HTTP のみ。送るのは IP アドレスだけ
      HttpRequest request = HttpRequest.newBuilder(URI.create(
          "http://ip-api.com/json/" + ip + "?fields=status,country,regionName,city,isp&lang=ja"))
          .timeout(Duration.ofSeconds(3))
          .GET()
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      JsonNode json = jsonMapper.readTree(response.body());
      if (!"success".equals(json.path("status").asString(""))) {
        return Geo.UNKNOWN;
      }
      return new Geo(text(json, "country"), text(json, "regionName"), text(json, "city"), text(json, "isp"));
    } catch (Exception e) {
      logger.warn("geo lookup failed for {}: {}", ip, e.getMessage());
      return Geo.UNKNOWN;
    }
  }

  private static String text(JsonNode json, String field) {
    String value = json.path(field).asString("");
    return value.isBlank() ? null : value;
  }

  static boolean isPrivate(String ip) {
    // IP の形式でない値は問い合わせない(ホスト名を渡すと DNS 解決が走るため、先に形式を確かめる)
    if (ip == null || !ip.matches("[0-9a-fA-F:.]+")) {
      return true;
    }
    try {
      InetAddress address = InetAddress.getByName(ip);
      return address.isLoopbackAddress() || address.isSiteLocalAddress() || address.isLinkLocalAddress()
          || address.isAnyLocalAddress()
          // IPv6 のユニークローカル(fc00::/7)
          || (address.getAddress().length == 16 && (address.getAddress()[0] & 0xfe) == 0xfc);
    } catch (Exception e) {
      return true;
    }
  }
}
