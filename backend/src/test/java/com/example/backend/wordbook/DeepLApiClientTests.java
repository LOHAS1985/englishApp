package com.example.backend.wordbook;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.POST;

/** DeepL の呼び出し(RestClient)。成功・失敗・キー未設定の扱い */
class DeepLApiClientTests {

  private static final String URL = "https://api-free.deepl.test/v2/translate";

  private MockRestServiceServer server(RestClient.Builder builder) {
    return MockRestServiceServer.bindTo(builder).build();
  }

  @Test
  void translatesAndSendsTheAuthKey() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = server(builder);
    server.expect(requestTo(URL)).andExpect(method(POST))
        .andExpect(header("Authorization", "DeepL-Auth-Key secret"))
        .andRespond(withSuccess("{\"translations\":[{\"text\":\"捨てる\"}]}", org.springframework.http.MediaType.APPLICATION_JSON));
    DeepLApiClient client = new DeepLApiClient("secret", URL, builder.build());

    assertThat(client.translateToJapanese("abandon")).isEqualTo("捨てる");
    server.verify();
  }

  @Test
  void aServerErrorGivesNullInsteadOfThrowing() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = server(builder);
    server.expect(requestTo(URL)).andRespond(withServerError());
    DeepLApiClient client = new DeepLApiClient("secret", URL, builder.build());

    assertThat(client.translateToJapanese("abandon")).isNull();
  }

  @Test
  void withoutAKeyOrTextNothingIsSent() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = server(builder);
    DeepLApiClient noKey = new DeepLApiClient("", URL, builder.build());

    assertThat(noKey.translateToJapanese("abandon")).isNull();
    assertThat(new DeepLApiClient("secret", URL, builder.build()).translateToJapanese("  ")).isNull();
    server.verify();
  }
}
