package com.example.backend.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductionConfigGuardTests {

  private static final String POSTGRES = "jdbc:postgresql://db.example.test/app";

  @Test
  void externalDatabaseAndAccessKeyPass() {
    assertThat(ProductionConfigGuard.problems(POSTGRES, "secret")).isEmpty();
    assertThatCode(() -> new ProductionConfigGuard(true, POSTGRES, "secret")).doesNotThrowAnyException();
  }

  @Test
  void inMemoryOrMissingDatabaseIsRejected() {
    String h2 = "jdbc:h2:mem:proddb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL";
    assertThat(ProductionConfigGuard.problems(h2, "secret")).singleElement().asString().contains("SPRING_DATASOURCE_URL");
    assertThat(ProductionConfigGuard.problems("", "secret")).singleElement().asString().contains("SPRING_DATASOURCE_URL");
    assertThat(ProductionConfigGuard.problems(null, "secret")).hasSize(1);
  }

  @Test
  void missingAccessKeyIsRejected() {
    assertThat(ProductionConfigGuard.problems(POSTGRES, "")).singleElement().asString().contains("APP_ACCESS_KEY");
    assertThat(ProductionConfigGuard.problems(POSTGRES, "   ")).hasSize(1);
    assertThat(ProductionConfigGuard.problems(POSTGRES, null)).hasSize(1);
  }

  @Test
  void startupFailsWithEveryMissingSettingListedAndNoValuesShown() {
    assertThatThrownBy(() -> new ProductionConfigGuard(true, "jdbc:h2:mem:x", ""))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("SPRING_DATASOURCE_URL")
        .hasMessageContaining("APP_ACCESS_KEY")
        .hasMessageNotContaining("jdbc:h2:mem:x");
  }

  @Test
  void strictCheckCanBeTurnedOffForTestsAndTheDockerBuild() {
    assertThatCode(() -> new ProductionConfigGuard(false, "", "")).doesNotThrowAnyException();
  }
}
