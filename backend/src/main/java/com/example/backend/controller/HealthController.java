package com.example.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

  private final JdbcTemplate jdbcTemplate;

  public HealthController(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @GetMapping("/health")
  public ResponseEntity<String> health() {
    // Neonを起動（DBへ接続）
    jdbcTemplate.queryForObject("SELECT 1", Integer.class);

    // Renderはこのリクエストを受けた時点で起動済み
    return ResponseEntity.ok("OK");
  }
}