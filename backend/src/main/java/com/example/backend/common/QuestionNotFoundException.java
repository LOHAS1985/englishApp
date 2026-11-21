package com.example.backend.common;

/**
 * 解答に付いてきた問題 ID が問題集に無い。入力の誤りではなく、画面の方が新しい(問題を追加した直後で、
 * サーバーのデプロイが遅れている)ことがあるので、400 ではなく 404 で返し、画面は後で再送する
 */
public class QuestionNotFoundException extends IllegalArgumentException {

  public QuestionNotFoundException(String message) {
    super(message);
  }
}
