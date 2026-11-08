package com.example.backend.mock;

/**
 * 正答率から TOEIC L&R の点数(5〜495)を推定する。
 * 公式の換算表ではなく、一般に公開されている目安を元にした仮の折れ線。画面では「参考値」と明示し、
 * 目標(930点)との差を見るために使う。精度を上げるには、公式の換算表が分かり次第ここを差し替える。
 */
public final class ToeicEstimate {

  public static final int MIN_SCORE = 5;
  public static final int MAX_SCORE = 495;
  /** 目標(CLAUDE.md:L 475 / R 455 で合計 930 点) */
  public static final int TARGET_LISTENING = 475;
  public static final int TARGET_READING = 455;
  public static final int TARGET_TOTAL = 930;

  /** 正答率(0〜1)と点数の対応。途中の値は直線で補間する。点数は正答率が上がると下がらない */
  static final double[][] ANCHORS = {
      {0.00, 5}, {0.20, 105}, {0.40, 200}, {0.60, 300}, {0.75, 400}, {0.85, 450}, {0.90, 475}, {0.97, 495},
      {1.00, 495}};

  private ToeicEstimate() {
  }

  /** 正解数と設問数から、そのセクションの推定点を返す。設問が無いときは最低点 */
  public static int scaled(int correct, int total) {
    if (total <= 0) {
      return MIN_SCORE;
    }
    double rate = Math.min(1.0, Math.max(0.0, correct / (double) total));
    for (int i = 1; i < ANCHORS.length; i++) {
      if (rate <= ANCHORS[i][0]) {
        double[] from = ANCHORS[i - 1];
        double[] to = ANCHORS[i];
        double t = (rate - from[0]) / (to[0] - from[0]);
        return (int) Math.round(from[1] + t * (to[1] - from[1]));
      }
    }
    return MAX_SCORE;
  }
}
