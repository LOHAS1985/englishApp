package com.example.backend.speaking;

import com.example.backend.common.PracticeRecord;
import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.common.QuestionSelector;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.speaking.SpeakingQuestionBank.SpeakingSet;
import com.example.backend.speaking.dto.SpeakingHistoryItem;
import com.example.backend.speaking.dto.SpeakingScoreRequest;
import com.example.backend.speaking.dto.SpeakingScoreResult;
import com.example.backend.stats.StudyLogService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 録音はブラウザの中だけで扱い、サーバーには送らない(Render のディスクは再デプロイで消える)。AI 採点には文字起こしだけを送る */
@RestController
@RequestMapping("/api/speaking")
public class SpeakingController {

  private final CurrentUserProvider currentUserProvider;
  private final SpeakingQuestionBank questionBank;
  private final QuestionSelector questionSelector;
  private final PracticeRecordRepository recordRepository;
  private final StudyLogService studyLogService;
  private final SpeakingService speakingService;

  public SpeakingController(CurrentUserProvider currentUserProvider,
      SpeakingQuestionBank questionBank, QuestionSelector questionSelector,
      PracticeRecordRepository recordRepository, StudyLogService studyLogService,
      SpeakingService speakingService) {
    this.currentUserProvider = currentUserProvider;
    this.questionBank = questionBank;
    this.questionSelector = questionSelector;
    this.recordRepository = recordRepository;
    this.studyLogService = studyLogService;
    this.speakingService = speakingService;
  }

  /** @param durationSeconds 出題から模範解答を見るまでの秒数 */
  public record CompleteRequest(String setId, Integer durationSeconds) {
  }

  /**
   * 面接形式の問題を1セット返す。自己採点用に模範解答も含める。
   * 正誤がないため、出題したことを記録して一巡するまで同じセットを出さない。
   */
  @GetMapping("/question")
  public SpeakingSet getQuestion(@RequestParam(required = false) String exclude,
      @RequestParam(required = false) String resumeId) {
    // 文字起こしの下書きを復元するときは、前回のセットをそのまま返す(出題の記録は前回に付いている)
    if (resumeId != null && !resumeId.isBlank()) {
      var resumed = questionBank.findById(resumeId);
      if (resumed.isPresent()) {
        return resumed.get();
      }
    }
    String id = questionSelector.pick("speaking", questionBank.ids(), exclude);
    recordRepository.save(new PracticeRecord(currentUserProvider.getCurrentUserId(), "speaking", id, 1, null, null));
    return questionBank.findById(id).orElseThrow();
  }

  @PostMapping("/complete")
  public void complete(@RequestBody CompleteRequest request) {
    SpeakingSet set = questionBank.findById(request.setId())
        .orElseThrow(() -> new IllegalArgumentException("問題が見つかりません: " + request.setId()));
    studyLogService.log("speaking", "eiken-interview", set.id(), null, null, request.durationSeconds());
  }

  /** AI 採点の履歴(新しい順に最大30件)。MyPage で伸びを見返す */
  @GetMapping("/history")
  public List<SpeakingHistoryItem> history() {
    return speakingService.history();
  }

  /** ナレーションまたは Q&A の1問を、文字起こしから Gemini で採点する */
  @PostMapping("/score")
  public SpeakingScoreResult score(@RequestBody SpeakingScoreRequest request) {
    return speakingService.score(request);
  }
}
