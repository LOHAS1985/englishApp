package com.example.backend.config;

import com.example.backend.common.ExternalApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/** 入力の誤り(存在しない問題IDなど)や外部APIの失敗を、500 ではなく原因の分かるメッセージで返す */
@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
    return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
  }

  @ExceptionHandler(ExternalApiException.class)
  public ResponseEntity<Map<String, String>> handleExternalApi(ExternalApiException e) {
    return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", e.getMessage()));
  }
}
