package com.example.backend.speaking;

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

  public SpeakingController(RecordingService recordingService, CurrentUserProvider currentUserProvider,
      SpeakingQuestionBank questionBank) {
    this.recordingService = recordingService;
    this.currentUserProvider = currentUserProvider;
    this.questionBank = questionBank;
  }

  /** 面接形式の問題を1セット返す。自己採点用に模範解答も含める */
  @GetMapping("/question")
  public SpeakingSet getQuestion() {
    return questionBank.random();
  }

  @PostMapping("/recordings")
  public ResponseEntity<?> uploadRecording(@RequestParam("file") MultipartFile file,
      @RequestParam(value = "exerciseId", required = false) Long exerciseId) {
    try {
      Recording r = recordingService.save(file, currentUserProvider.getCurrentUser().getId());
      return ResponseEntity.ok(Map.of("recordingId", r.getId()));
    } catch (IOException e) {
      return ResponseEntity.status(500).body(Map.of("error", "upload failed"));
    }
  }
}
