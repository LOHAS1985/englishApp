package com.example.backend.config;

import com.example.backend.common.ExternalApiException;
import com.example.backend.common.QuestionNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
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

  /** 問題 ID が問題集に無い。画面は一定時間、再送を続ける(IllegalArgumentException より具体的なので、こちらが使われる) */
  @ExceptionHandler(QuestionNotFoundException.class)
  public ResponseEntity<Map<String, String>> handleQuestionNotFound(QuestionNotFoundException e) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
  }

  /** 同じ解答の同時送信で、片方がすでに保存された(一意制約)。画面は再送しない */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<Map<String, String>> handleConflict(DataIntegrityViolationException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "すでに記録されています。"));
  }

  @ExceptionHandler(ExternalApiException.class)
  public ResponseEntity<Map<String, String>> handleExternalApi(ExternalApiException e) {
    return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", e.getMessage()));
  }
}
