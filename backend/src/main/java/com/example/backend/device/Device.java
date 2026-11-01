package com.example.backend.device;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** アクセスを許可した端末。鍵そのものは保存せず、ハッシュだけを持つ */
@Entity
@Table(name = "devices")
public class Device {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /** 利用者が見分けるための名前(例: 「iPhone / Safari」「自宅のPC」) */
  @Column(nullable = false, length = 100)
  private String name;

  @Column(name = "token_hash", nullable = false, length = 64, unique = true)
  private String tokenHash;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "last_used_at")
  private LocalDateTime lastUsedAt;

  public Device() {
  }

  public Device(String name, String tokenHash, LocalDateTime createdAt) {
    this.name = name;
    this.tokenHash = tokenHash;
    this.createdAt = createdAt;
    this.lastUsedAt = createdAt;
  }

  public Long getId() { return id; }
  public String getName() { return name; }
  public String getTokenHash() { return tokenHash; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public LocalDateTime getLastUsedAt() { return lastUsedAt; }
  public void setLastUsedAt(LocalDateTime lastUsedAt) { this.lastUsedAt = lastUsedAt; }
}
