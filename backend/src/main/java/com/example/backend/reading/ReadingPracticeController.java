package com.example.backend.reading;

import com.example.backend.common.QuestionSetPractice;
import com.example.backend.common.QuestionSetPractice.QuestionSetView;
import com.example.backend.common.QuestionSetPractice.SetAnswerRequest;
import com.example.backend.common.QuestionSetPractice.SetAnswerResult;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 読解問題(TOEIC Part 6 / 7、英検の長文)。Guardian 記事の多読(ReadingController)とは別機能 */
@RestController
@RequestMapping("/api/reading/practice")
public class ReadingPracticeController {

  private final ReadingQuestionBank questionBank;
  private final QuestionSetPractice practice;

  public ReadingPracticeController(ReadingQuestionBank questionBank, QuestionSetPractice practice) {
    this.questionBank = questionBank;
    this.practice = practice;
  }

  /** 形式ごとの登録セット数 */
  @GetMapping("/types")
  public Map<String, Long> types() {
    return questionBank.countByType();
  }

  @GetMapping
  public QuestionSetView getSet(@RequestParam(required = false) String type,
      @RequestParam(required = false) String exclude) {
    return practice.next(questionBank, "reading", type, exclude);
  }

  @PostMapping("/answer")
  public SetAnswerResult answer(@RequestBody SetAnswerRequest request) {
    return practice.grade(questionBank, "reading", request);
  }
}
