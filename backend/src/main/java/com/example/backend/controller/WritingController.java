package com.example.backend.controller;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.dto.ScoreRequest;
import com.example.backend.dto.ScoreResult;
import com.example.backend.dto.WritingHistoryItem;
import com.example.backend.dto.WritingQuestion;
import com.example.backend.entity.User;
import com.example.backend.repository.WritingRecordRepository;
import com.example.backend.service.GeminiService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/writing")
public class WritingController {

  private final GeminiService geminiService;
  private final CurrentUserProvider currentUserProvider;
  private final WritingRecordRepository writingRecordRepository;

  public WritingController(GeminiService geminiService,
      CurrentUserProvider currentUserProvider,
      WritingRecordRepository writingRecordRepository) {
    this.geminiService = geminiService;
    this.currentUserProvider = currentUserProvider;
    this.writingRecordRepository = writingRecordRepository;
  }

  @GetMapping("/question")
  public WritingQuestion getQuestion() {
    return geminiService.generateWritingQuestion();
  }

  @PostMapping("/score")
  public ScoreResult scoreAnswer(@RequestBody ScoreRequest request) {
    return geminiService.scoreAnswer(request);
  }

  @GetMapping("/history")
  public List<WritingHistoryItem> getHistory() {
    User user = currentUserProvider.getCurrentUser();
    return writingRecordRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
        .stream()
        .map(WritingHistoryItem::from)
        .toList();
  }
}