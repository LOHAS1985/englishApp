package com.example.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.info.InfoEndpoint;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "RENDER_GIT_COMMIT=0123abc")
class InfoEndpointTests {

  @Autowired
  private InfoEndpoint infoEndpoint;

  @Test
  void infoShowsTheDeployedCommit() {
    assertThat(infoEndpoint.info()).containsEntry("commit", "0123abc");
  }
}
