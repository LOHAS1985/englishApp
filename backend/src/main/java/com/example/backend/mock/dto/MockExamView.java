package com.example.backend.mock.dto;

import java.util.List;

/**
 * 模試の問題一式(解答前の形)。正解・解説・台本は含めない。
 * 区切り(セクション)ごとに制限時間があり、順に解く。
 */
public record MockExamView(List<Section> sections) {

  /** skill: listening / reading。minutes は本番の制限時間 */
  public record Section(String skill, int minutes, List<Item> items) {
  }

  /**
   * 1つの長文・音声(または Part 5 の1問)。feature は解答を送るときの区分(listening / reading / grammar)。
   * 音声だけの形式(Part 2)は questions の文字を空で返す。
   */
  public record Item(String feature, String id, String type, String title, String passage, String situation,
      String graphic, List<Question> questions) {
  }

  /** 設問文と選択肢(A, B, C... の順)。Part 5 は設問文が空 */
  public record Question(String question, List<String> choices) {
  }
}
