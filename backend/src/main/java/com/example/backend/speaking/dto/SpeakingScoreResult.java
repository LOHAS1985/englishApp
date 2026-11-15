package com.example.backend.speaking.dto;

/**
 * 採点結果。4観点を各 0〜4 点(16点満点)で返す。
 * Gemini は total を返さなくてよい(サーバーが4観点の合計で上書きする)。
 *
 * @param betterAnswer 答えを改善した英語の例(話し言葉。模範解答のコピーではなく、利用者の答えを直したもの)
 */
public record SpeakingScoreResult(
    Criterion content,
    Criterion structure,
    Criterion vocabulary,
    Criterion grammar,
    String betterAnswer,
    int total) {

  public record Criterion(int score, String feedback) {
  }
}
