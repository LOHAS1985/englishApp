package com.example.backend.device;

import com.example.backend.device.DeviceService.DeviceLimitException;
import com.example.backend.device.DeviceService.Registration;
import com.example.backend.device.DeviceService.WrongKeyException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = { "app.access-key=secret-words", "app.max-devices=2" })
class DeviceTests {

  @Autowired
  private DeviceService service;
  @Autowired
  private DeviceFilter filter;
  @Autowired
  private DeviceRepository repository;

  @BeforeEach
  void clear() {
    repository.findAll().forEach(d -> service.delete(d.getId()));
  }

  @Test
  void registersUpToTheLimitWithTheRightKeyOnly() {
    assertThatThrownBy(() -> service.register("wrong", "PC")).isInstanceOf(WrongKeyException.class);

    Registration pc = service.register("secret-words", "自宅のPC");
    Registration phone = service.register("secret-words", "iPhone");
    assertThat(pc.token()).isNotEqualTo(phone.token());
    assertThat(service.authenticate(pc.token())).isEqualTo(pc.device().id());
    assertThat(service.authenticate("not-a-device")).isNull();
    // 合言葉が正しくても、上限(このテストでは2台)を超えて登録できない
    assertThatThrownBy(() -> service.register("secret-words", "知らない端末"))
        .isInstanceOf(DeviceLimitException.class);
    // 鍵そのものは保存しない
    assertThat(repository.findAll()).noneMatch(d -> d.getTokenHash().equals(pc.token()));
  }

  @Test
  void deletedDevicesAreRejectedAndFreeASlot() {
    Registration pc = service.register("secret-words", "PC");
    service.register("secret-words", "PC2");
    service.delete(pc.device().id());
    assertThat(service.authenticate(pc.token())).isNull();
    assertThat(service.register("secret-words", "新しいスマホ").token()).isNotBlank();
  }

  @Test
  void listMarksTheCurrentDevice() {
    Registration pc = service.register("secret-words", "PC");
    service.register("secret-words", "iPhone");
    assertThat(service.list(pc.device().id()))
        .extracting(DeviceService.DeviceView::name, DeviceService.DeviceView::current)
        .containsExactly(org.assertj.core.groups.Tuple.tuple("PC", true),
            org.assertj.core.groups.Tuple.tuple("iPhone", false));
  }

  @Test
  void filterLetsOnlyRegisteredDevicesUseTheApi() throws Exception {
    String token = service.register("secret-words", "PC").token();
    assertThat(call("GET", "/api/grammar/question", null)).isEqualTo(401);
    assertThat(call("GET", "/api/grammar/question", "forged-token")).isEqualTo(401);
    assertThat(call("GET", "/api/grammar/question", token)).isEqualTo(200);
    // 登録そのもの・死活監視・音声・プリフライト・アクセス履歴(独自キー)は端末の鍵なしで通す
    assertThat(call("POST", "/api/devices/register", null)).isEqualTo(200);
    assertThat(call("GET", "/health", null)).isEqualTo(200);
    assertThat(call("GET", "/audio/generated/a.mp3", null)).isEqualTo(200);
    assertThat(call("OPTIONS", "/api/grammar/question", null)).isEqualTo(200);
    assertThat(call("GET", "/api/access-logs", null)).isEqualTo(200);
  }

  @Test
  void cleansDeviceNames() {
    assertThat(DeviceService.cleanName("  ")).isEqualTo("端末");
    assertThat(DeviceService.cleanName(" iPhone ")).isEqualTo("iPhone");
    assertThat(DeviceService.cleanName("x".repeat(150))).hasSize(100);
  }

  private int call(String method, String path, String token) throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest(method, path);
    if (token != null) {
      request.addHeader(DeviceFilter.HEADER, token);
    }
    MockHttpServletResponse response = new MockHttpServletResponse();
    filter.doFilter(request, response, new MockFilterChain());
    return response.getStatus();
  }
}
