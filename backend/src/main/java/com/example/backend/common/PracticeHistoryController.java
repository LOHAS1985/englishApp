package com.example.backend.common;

import com.example.backend.common.QuestionSelector.AnswerRow;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 画面側で出題するための解答履歴(文法・語彙・読解・リスニング)。
 * 問題集は画面に同梱しているので、画面はこの履歴を裏で取得してブラウザに保存し、
 * サーバーが停止中でも待たずに次の問題を選べるようにしている。
 */
@RestController
@RequestMapping("/api/practice")
public class PracticeHistoryController {

  private final QuestionSelector questionSelector;

  public PracticeHistoryController(QuestionSelector questionSelector) {
    this.questionSelector = questionSelector;
  }

  /** @param feature grammar / vocab / reading / listening */
  @GetMapping("/history")
  public List<AnswerRow> history(@RequestParam String feature) {
    return questionSelector.answerRows(feature);
  }
}
