package com.example.backend.wordbook;

/**
 * 単語の色。利用者が手動で付ける(間違えたときは自動で赤になる)。
 * 無色は「まだ判定していない」、青は覚えた、黄はあいまい、赤は苦手。
 * 出題は {@link WordbookPicker} が、無色の語(9割。まだ出していない語を先に)と復習日が来た色付きの語(1割)→
 * 色付きの未出題の語 → それ以外(次の復習日がまだ先の語)の順に選ぶ。色は、復習日が来た語の中などでの選ばれやすさに使う。
 */
public enum WordbookColor {
  // 引数: 復習日が来た色付きの語・色付きの未出題の語・どちらでもない語(次の復習日がまだ先の語)の中での選ばれやすさ
  // (無色の語は別枠で優先して出すので、無色の重みは使われない)
  NONE(2, 10, 25),
  BLUE(1, 1, 1),
  YELLOW(2, 10, 2),
  RED(4, 10, 5);

  private final int dueWeight;
  private final int newWeight;
  private final int weight;

  WordbookColor(int dueWeight, int newWeight, int weight) {
    this.dueWeight = dueWeight;
    this.newWeight = newWeight;
    this.weight = weight;
  }

  /** 復習日が来た語の中での重み。苦手(赤)を先に出す */
  public int dueWeight() {
    return dueWeight;
  }

  /** 色付きの未出題の語の中での重み。覚えた(青)の語は後回しにする */
  public int newWeight() {
    return newWeight;
  }

  /** 復習日が来た語も新規の語も無いときの重み(次の復習日がまだ先の語から選ぶ) */
  public int weight() {
    return weight;
  }
}
