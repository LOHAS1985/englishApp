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

/**
 * リスニング問題。問題集から出題し、音声は台本からサーバーで生成する。
 * 台本と和訳は問題集を画面に同梱しないので、解答後は {@code /reveal} から取る。
 */
@RestController
@RequestMapping("/api/listening/practice")
public class ListeningController {

  private static final Logger logger = LoggerFactory.getLogger(ListeningController.class);

  /** 解答後に見せる台本と和訳 */
  public record Reveal(String script, String translation) {
  }

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

  /** @param level 難易度(1〜3)。省略時は直近の正答率に合わせて自動で選ぶ */
  @GetMapping
  public QuestionSetView getSet(@RequestParam(required = false) String type,
      @RequestParam(required = false) String exclude, @RequestParam(required = false) Integer level) {
    return practice.next(questionBank, "listening", type, exclude, level);
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

  /**
   * サーバーの音声生成が使えないとき、ブラウザの読み上げ機能で再生するための台本(画面には表示しない)。
   * 音声は解答の前に聞くので、解答前にも取れる。解答後の表示には {@code /reveal} を使う。
   */
  @GetMapping("/{setId}/script")
  public Map<String, String> script(@PathVariable String setId) {
    QuestionSet set = questionBank.findById(setId)
        .orElseThrow(() -> new IllegalArgumentException("問題が見つかりません: " + setId));
    return Map.of("script", set.script());
  }

  /** 解答後に台本と和訳を見せる。解答の送信を待たせないよう、解答済みかどうかは確かめない */
  @GetMapping("/{setId}/reveal")
  public Reveal reveal(@PathVariable String setId) {
    QuestionSet set = questionBank.findById(setId)
        .orElseThrow(() -> new IllegalArgumentException("問題が見つかりません: " + setId));
    return new Reveal(set.script(), set.translation());
  }

  @PostMapping("/answer")
  public SetAnswerResult answer(@RequestBody SetAnswerRequest request) {
    return practice.grade(questionBank, "listening", request);
  }
}
