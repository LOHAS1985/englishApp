package com.example.backend.accesslog;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class AccessLogTests {

  @Test
  void clientIpPrefersFirstForwardedAddress() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRemoteAddr("10.0.0.5");
    request.addHeader("X-Forwarded-For", "203.0.113.7, 10.0.0.1");
    assertThat(AccessLogFilter.clientIp(request)).isEqualTo("203.0.113.7");

    MockHttpServletRequest direct = new MockHttpServletRequest();
    direct.setRemoteAddr("198.51.100.2");
    assertThat(AccessLogFilter.clientIp(direct)).isEqualTo("198.51.100.2");
  }

  @Test
  void privateAddressesAreNotLookedUp() {
    assertThat(GeoIpService.isPrivate("127.0.0.1")).isTrue();
    assertThat(GeoIpService.isPrivate("192.168.1.10")).isTrue();
    assertThat(GeoIpService.isPrivate("::1")).isTrue();
    assertThat(GeoIpService.isPrivate("fd12::1")).isTrue();
    assertThat(GeoIpService.isPrivate("example.com")).isTrue();
    assertThat(GeoIpService.isPrivate("203.0.113.7")).isFalse();
  }

  @Test
  void describesCommonDevices() {
    assertThat(AccessLogService.describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"))
        .isEqualTo("iPhone / Safari");
    assertThat(AccessLogService.describeDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0"))
        .isEqualTo("Windows / Edge");
    assertThat(AccessLogService.describeDevice("curl/8.5.0")).isEqualTo("curl");
    assertThat(AccessLogService.describeDevice(null)).isEqualTo("不明");
  }
}
