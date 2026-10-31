package com.example.backend.common;

import java.util.List;

/**
 * 英検準1級の長文・リスニング説明文・ライティングの話題分類。本番は社会問題・環境・科学技術・医療などから
 * 幅広く出るので、特定の話題に偏らないよう問題集の theme をこの7つから選び、割合をテストで検査する。
 */
public final class Themes {

  public static final List<String> ALL = List.of(
      "社会・政治",
      "環境・エネルギー",
      "科学・技術",
      "医療・健康",
      "教育・心理",
      "ビジネス・経済",
      "文化・歴史・生活");

  /** theme が必須の形式(英検の大問2・3、リスニング Part 2、ライティング) */
  public static final List<String> REQUIRED_TYPES = List.of("eiken-cloze", "eiken-long", "eiken-part2", "opinion",
      "summary");

  private Themes() {
  }
}
