package com.example.backend.vocab;

import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.common.PracticeRecord;
import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.dto.GrammarAnswerRequest;
import com.example.backend.grammar.dto.GrammarAnswerResult;
import com.example.backend.grammar.dto.GrammarQuestion;
import com.example.backend.review.ReviewService;
import com.example.backend.stats.StudyLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/** 語彙問題(4択の短文空所補充)。出題・採点の形は文法問題と同じ */
@RestController
@RequestMapping("/api/vocab")
public class VocabController {

  private final VocabQuestionBank questionBank;
  private final PracticeRecordRepository recordRepository;
  private final CurrentUserProvider currentUserProvider;
  private final StudyLogService studyLogService;
  private final ReviewService reviewService;

  public VocabController(VocabQuestionBank questionBank, PracticeRecordRepository recordRepository,
      CurrentUserProvider currentUserProvider, StudyLogService studyLogService, ReviewService reviewService) {
    this.questionBank = questionBank;
    this.recordRepository = recordRepository;
    this.currentUserProvider = currentUserProvider;
    this.studyLogService = studyLogService;
    this.reviewService = reviewService;
  }

  /**
   * 復習の出題(復習日になった間違えた問題)。通常の出題は画面が同梱の問題集から行う(api/localQuestions.ts)。
   * 画面は ?review=true を付けて呼ぶ(付けなくても復習から出す)
   */
  @GetMapping("/question")
  public GrammarQuestion getQuestion(@RequestParam(required = false) String exclude) {
    String id = reviewService.pickDue("vocab", exclude);
    ChoiceQuestion q = questionBank.findById(id).orElseThrow();
    return new GrammarQuestion(q.id(), q.sentence(), q.choices(), questionBank.difficulty(q.id()));
  }

  /** 解答記録・学習ログ・復習を1つのトランザクションにする(一部だけ保存されて再送で重複するのを防ぐ) */
  @PostMapping("/answer")
  @Transactional
  public ResponseEntity<?> answer(@RequestBody GrammarAnswerRequest request) {
    ChoiceQuestion q = questionBank.findById(request.getQuestionId()).orElse(null);
    if (q == null) {
      return ResponseEntity.status(404).body(Map.of("error", "問題が見つかりません。再度出題してください。"));
    }
    String selected = request.getSelectedChoice() == null ? "" : request.getSelectedChoice().trim().toUpperCase();
    boolean correct = q.answer().equals(selected);
    // 同じ clientRequestId の再送は、記録を追加せず採点結果だけ返す
    if (!studyLogService.isRecorded(request.getClientRequestId())) {
      LocalDateTime answeredAt = StudyLogService.answeredAt(request.getAnsweredAt());
      recordRepository.save(new PracticeRecord(currentUserProvider.getCurrentUserId(), "vocab", q.id(), 1,
          selected.isEmpty() ? null : selected, correct));
      studyLogService.log("vocab", "vocab", q.id(), correct ? 1 : 0, 1, request.getDurationSeconds(),
          request.getClientRequestId(), answeredAt);
      reviewService.record("vocab", q.id(), correct, answeredAt);
    }
    return ResponseEntity.ok(new GrammarAnswerResult(correct, q.answer(), q.explanation(), q.translation()));
  }
}
