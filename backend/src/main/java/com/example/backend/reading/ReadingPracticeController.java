package com.example.backend.reading;

import com.example.backend.common.QuestionSetPractice;
import com.example.backend.common.QuestionSetPractice.QuestionSetView;
import com.example.backend.common.QuestionSetPractice.SetAnswerRequest;
import com.example.backend.common.QuestionSetPractice.SetAnswerResult;
import com.example.backend.reading.dto.ReadingSpeedItem;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** 読解問題(TOEIC Part 6 / 7、英検の長文)。Guardian 記事の多読(ReadingController)とは別機能 */
@RestController
@RequestMapping("/api/reading/practice")
public class ReadingPracticeController {

  private final ReadingQuestionBank questionBank;
  private final QuestionSetPractice practice;
  private final ReadingSpeedService speedService;

  public ReadingPracticeController(ReadingQuestionBank questionBank, QuestionSetPractice practice,
      ReadingSpeedService speedService) {
    this.questionBank = questionBank;
    this.practice = practice;
    this.speedService = speedService;
  }

  /** 形式ごとの登録セット数 */
  @GetMapping("/types")
  public Map<String, Long> types() {
    return questionBank.countByType();
  }

  /** @param level 難易度(1〜3)。省略時は直近の正答率に合わせて自動で選ぶ */
  @GetMapping
  public QuestionSetView getSet(@RequestParam(required = false) String type,
      @RequestParam(required = false) String exclude, @RequestParam(required = false) Integer level) {
    return practice.next(questionBank, "reading", type, exclude, level);
  }

  @PostMapping("/answer")
  public SetAnswerResult answer(@RequestBody SetAnswerRequest request) {
    SetAnswerResult result = practice.grade(questionBank, "reading", request);
    speedService.save(questionBank, request.setId(), request.readingSeconds());
    return result;
  }

  /** 読解速度の直近の計測(新しい順) */
  @GetMapping("/speed")
  public List<ReadingSpeedItem> speed() {
    return speedService.recent();
  }
}
