package com.example.backend.common;

/** 外部API(Gemini・DeepL など)の失敗。ApiExceptionHandler が 502 とメッセージで返す */
public class ExternalApiException extends RuntimeException {

  public ExternalApiException(String message, Throwable cause) {
    super(message, cause);
  }
}
