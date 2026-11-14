package com.example.backend.common;

import jakarta.persistence.*;

/** 起動時・定期処理の状態(同梱語の投入版、日本語訳の調査を最後に行った日など)。キーごとに1行 */
@Entity
@Table(name = "app_state")
public class AppState {

  @Id
  @Column(name = "state_key", length = 60)
  private String key;

  @Column(name = "state_value", nullable = false, length = 60)
  private String value;

  public AppState() {
  }

  public AppState(String key, String value) {
    this.key = key;
    this.value = value;
  }

  public String getKey() { return key; }
  public String getValue() { return value; }

  public void setValue(String value) {
    this.value = value;
  }
}
