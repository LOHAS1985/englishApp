package com.example.backend.writing;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.writing.dto.ScoreRequest;
import com.example.backend.writing.dto.ScoreResult;
import com.example.backend.writing.dto.WritingHistoryItem;
import com.example.backend.writing.dto.WritingQuestion;
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
  public WritingQuestion getQuestion(@RequestParam(required = false) String type,
      @RequestParam(required = false) String exclude) {
    return geminiService.generateWritingQuestion(type, exclude);
  }

  @PostMapping("/score")
  public ScoreResult scoreAnswer(@RequestBody ScoreRequest request) {
    return geminiService.scoreAnswer(request);
  }

  @GetMapping("/history")
  public List<WritingHistoryItem> getHistory() {
    return writingRecordRepository.findByUserIdOrderByCreatedAtDesc(currentUserProvider.getCurrentUserId())
        .stream()
        .map(WritingHistoryItem::from)
        .toList();
  }
}