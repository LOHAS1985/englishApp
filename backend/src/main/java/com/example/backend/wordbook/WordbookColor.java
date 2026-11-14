package com.example.backend.wordbook;

/**
 * 単語の色。利用者が手動で付ける。出題頻度は {@link #weight} に比例する。
 * 無色は「まだ判定していない」、青は覚えた、黄はあいまい、赤は苦手。
 */
public enum WordbookColor {
  NONE(5),
  BLUE(1),
  YELLOW(2),
  RED(5);

  private final int weight;

  WordbookColor(int weight) {
    this.weight = weight;
  }

  public int weight() {
    return weight;
  }
}
