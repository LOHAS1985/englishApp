package com.example.backend.listening;

import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.common.QuestionSetPractice;
import com.example.backend.common.QuestionSetPractice.QuestionSetView;
import com.example.backend.common.QuestionSetPractice.SetAnswerRequest;
import com.example.backend.common.QuestionSetPractice.SetAnswerResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/** リスニング問題。問題集から出題し、台本は解答後にだけ返す(音声は台本からサーバーで生成) */
@RestController
@RequestMapping("/api/listening/practice")
public class ListeningController {

  private static final Logger logger = LoggerFactory.getLogger(ListeningController.class);

  private final ListeningQuestionBank questionBank;
  private final QuestionSetPractice practice;
  private final TtsService ttsService;

  public ListeningController(ListeningQuestionBank questionBank, QuestionSetPractice practice,
      TtsService ttsService) {
    this.questionBank = questionBank;
    this.practice = practice;
    this.ttsService = ttsService;
  }

  /** 形式ごとの登録セット数 */
  @GetMapping("/types")
  public Map<String, Long> types() {
    return questionBank.countByType();
  }

  @GetMapping
  public QuestionSetView getSet(@RequestParam(required = false) String type) {
    return practice.toView(questionBank.random(type));
  }

  /** セットの台本を音声化して URL を返す。同じ台本は2回目以降キャッシュから返る */
  @PostMapping("/{setId}/audio")
  public CompletableFuture<ResponseEntity<?>> audio(@PathVariable String setId) {
    QuestionSet set = questionBank.findById(setId)
        .orElseThrow(() -> new IllegalArgumentException("問題が見つかりません: " + setId));
    return ttsService.synthesizeAsync(set.script(), set.id())
        .<ResponseEntity<?>>thenApply(ResponseEntity::ok)
        .exceptionally(e -> {
          logger.error("synthesize failed for {}", setId, e);
          return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e.getMessage())));
        });
  }

  /** サーバーの音声生成が使えないとき、ブラウザの読み上げ機能で再生するための台本(画面には表示しない) */
  @GetMapping("/{setId}/script")
  public Map<String, String> script(@PathVariable String setId) {
    QuestionSet set = questionBank.findById(setId)
        .orElseThrow(() -> new IllegalArgumentException("問題が見つかりません: " + setId));
    return Map.of("script", set.script());
  }

  @PostMapping("/answer")
  public SetAnswerResult answer(@RequestBody SetAnswerRequest request) {
    return practice.grade(questionBank, "listening", request);
  }
}
