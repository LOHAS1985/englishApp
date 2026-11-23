package com.example.backend.reading;

import com.example.backend.common.QuestionSetPractice;
import com.example.backend.common.QuestionSetPractice.SetAnswerRequest;
import com.example.backend.common.QuestionSetPractice.SetAnswerResult;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 読解問題(TOEIC Part 6 / 7、英検の長文) */
@RestController
@RequestMapping("/api/reading/practice")
public class ReadingPracticeController {

  private final ReadingQuestionBank questionBank;
  private final QuestionSetPractice practice;

  public ReadingPracticeController(ReadingQuestionBank questionBank, QuestionSetPractice practice) {
    this.questionBank = questionBank;
    this.practice = practice;
  }

  @PostMapping("/answer")
  public SetAnswerResult answer(@RequestBody SetAnswerRequest request) {
    return practice.grade(questionBank, "reading", request);
  }

  /** 今日復習する設問を含むセットのID。画面は、このセットを復習として出す */
  @GetMapping("/review")
  public Map<String, String> review(@RequestParam(required = false) String exclude) {
    return Map.of("setId", practice.dueSetId(questionBank, "reading", exclude));
  }
}
