package com.example.backend.common;

/**
 * 英検準1級のライティング・スピーキングの採点の枠(4観点×各0〜4点、16点満点)。
 * Gemini が範囲外の点数を返しても、この枠に収める(WritingService・SpeakingService で共通)
 */
public final class EikenScores {

  /** 1観点の満点 */
  public static final int MAX_CRITERION_SCORE = 4;
  /** 観点の数(内容・構成・語彙・文法) */
  public static final int CRITERIA = 4;
  /** 合計の満点 */
  public static final int MAX_TOTAL = MAX_CRITERION_SCORE * CRITERIA;

  private EikenScores() {
  }

  /** 1観点の点数を 0〜4 に収める */
  public static int clampCriterion(int score) {
    return Math.min(Math.max(score, 0), MAX_CRITERION_SCORE);
  }
}
