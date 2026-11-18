package com.example.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class CorsConfigTests {

  // Spring MVC の内部にも同じ型の Bean があるので、アプリで定義したものを名前で指定する
  @Autowired
  @Qualifier("corsConfigurationSource")
  private CorsConfigurationSource source;

  private CorsConfiguration forApi() {
    MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/stats/summary");
    return source.getCorsConfiguration(request);
  }

  /** プリフライトを長く覚えさせないと、ほぼ毎回の API 呼び出しに 0.2〜0.4 秒の往復が増える */
  @Test
  void preflightIsCachedByTheBrowser() {
    CorsConfiguration cors = forApi();
    assertThat(cors).isNotNull();
    // Chrome は2時間までしか覚えない。短すぎる(既定の約5秒に近い)値にしない
    assertThat(cors.getMaxAge()).isEqualTo(Duration.ofHours(1).toSeconds());
  }

  @Test
  void onlyTheAppAndLocalDevelopmentCanCallTheApi() {
    CorsConfiguration cors = forApi();
    assertThat(cors.checkOrigin("https://lohas1985.github.io")).isNotNull();
    assertThat(cors.checkOrigin("http://localhost:5173")).isNotNull();
    assertThat(cors.checkOrigin("https://example.com")).isNull();
  }

  @Test
  void deviceTokenHeaderIsAllowed() {
    assertThat(forApi().checkHeaders(java.util.List.of("x-device-token"))).isNotEmpty();
  }
}
