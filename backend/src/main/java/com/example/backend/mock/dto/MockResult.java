package com.example.backend.mock.dto;

import java.util.List;

/**
 * 模試の結果。点数は参考値(換算は ToeicEstimate)。目標は 930 点(L 475 / R 455)。
 * Part 1 は画像が無いので出題していない(L は Part 2〜4 の正答率で推定する)。
 */
public record MockResult(
    long id,
    Section listening,
    Section reading,
    int estimatedTotal,
    int targetTotal,
    List<Part> parts) {

  public record Section(String skill, int correct, int total, int estimated, int target, int seconds) {
  }

  /** 形式ごとの正解数(どの形式で落としたかを見るため) */
  public record Part(String type, int correct, int total) {
  }
}
