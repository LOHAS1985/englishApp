package com.example.backend.mock.dto;

import java.util.List;

/** 模試の解答。区切りごとに、出題された問題と答え(A〜D の記号。未解答は空文字)を送る */
public record MockSubmit(List<Section> sections) {

  /** @param durationSeconds 区切りの開始から終了までの秒数 */
  public record Section(String skill, Integer durationSeconds, List<Answer> items) {
  }

  /** @param feature listening / reading / grammar。問題集を決めるために使う */
  public record Answer(String feature, String id, List<String> answers) {
  }
}
