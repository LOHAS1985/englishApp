package com.example.backend.speaking;

import com.example.backend.common.PracticeRecord;
import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.common.QuestionSelector;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.speaking.SpeakingQuestionBank.SpeakingSet;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/speaking")
public class SpeakingController {

  private final RecordingService recordingService;
  private final CurrentUserProvider currentUserProvider;
  private final SpeakingQuestionBank questionBank;
  private final QuestionSelector questionSelector;
  private final PracticeRecordRepository recordRepository;

  public SpeakingController(RecordingService recordingService, CurrentUserProvider currentUserProvider,
      SpeakingQuestionBank questionBank, QuestionSelector questionSelector,
      PracticeRecordRepository recordRepository) {
    this.recordingService = recordingService;
    this.currentUserProvider = currentUserProvider;
    this.questionBank = questionBank;
    this.questionSelector = questionSelector;
    this.recordRepository = recordRepository;
  }

  /**
   * 面接形式の問題を1セット返す。自己採点用に模範解答も含める。
   * 正誤がないため、出題したことを記録して一巡するまで同じセットを出さない。
   */
  @GetMapping("/question")
  public SpeakingSet getQuestion(@RequestParam(required = false) String exclude) {
    String id = questionSelector.pick("speaking", questionBank.ids(), exclude);
    recordRepository.save(new PracticeRecord(currentUserProvider.getCurrentUserId(), "speaking", id, 1, null, null));
    return questionBank.findById(id).orElseThrow();
  }

  @PostMapping("/recordings")
  public ResponseEntity<?> uploadRecording(@RequestParam("file") MultipartFile file,
      @RequestParam(value = "exerciseId", required = false) Long exerciseId) {
    try {
      Recording r = recordingService.save(file, currentUserProvider.getCurrentUserId());
      return ResponseEntity.ok(Map.of("recordingId", r.getId()));
    } catch (IOException e) {
      return ResponseEntity.status(500).body(Map.of("error", "upload failed"));
    }
  }
}
