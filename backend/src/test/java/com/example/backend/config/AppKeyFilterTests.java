package com.example.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class AppKeyFilterTests {

  private static MockHttpServletResponse call(AppKeyFilter filter, String method, String path, String key)
      throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest(method, path);
    if (key != null) {
      request.addHeader(AppKeyFilter.HEADER, key);
    }
    MockHttpServletResponse response = new MockHttpServletResponse();
    filter.doFilter(request, response, new MockFilterChain());
    return response;
  }

  @Test
  void rejectsApiRequestsWithoutTheKey() throws Exception {
    AppKeyFilter filter = new AppKeyFilter("secret-words");
    assertThat(call(filter, "GET", "/api/grammar/question", null).getStatus()).isEqualTo(401);
    assertThat(call(filter, "GET", "/api/grammar/question", "wrong").getStatus()).isEqualTo(401);
    assertThat(call(filter, "POST", "/api/admin/words", null).getStatus()).isEqualTo(401);
    assertThat(call(filter, "GET", "/api/grammar/question", "secret-words").getStatus()).isEqualTo(200);
  }

  @Test
  void leavesHealthAudioPreflightAndAccessLogsAlone() throws Exception {
    AppKeyFilter filter = new AppKeyFilter("secret-words");
    assertThat(call(filter, "GET", "/health", null).getStatus()).isEqualTo(200);
    assertThat(call(filter, "GET", "/audio/generated/a.mp3", null).getStatus()).isEqualTo(200);
    assertThat(call(filter, "OPTIONS", "/api/grammar/question", null).getStatus()).isEqualTo(200);
    // 閲覧キー(ACCESS_LOG_KEY)で別に守られている
    assertThat(call(filter, "GET", "/api/access-logs", null).getStatus()).isEqualTo(200);
  }

  @Test
  void allowsEverythingWhenNoKeyIsConfigured() throws Exception {
    AppKeyFilter filter = new AppKeyFilter("");
    assertThat(call(filter, "GET", "/api/grammar/question", null).getStatus()).isEqualTo(200);
  }
}
