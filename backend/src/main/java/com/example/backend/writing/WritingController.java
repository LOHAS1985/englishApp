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

  private final WritingService writingService;
  private final CurrentUserProvider currentUserProvider;
  private final WritingRecordRepository writingRecordRepository;

  public WritingController(WritingService writingService,
      CurrentUserProvider currentUserProvider,
      WritingRecordRepository writingRecordRepository) {
    this.writingService = writingService;
    this.currentUserProvider = currentUserProvider;
    this.writingRecordRepository = writingRecordRepository;
  }

  @GetMapping("/question")
  public WritingQuestion getQuestion(@RequestParam(required = false) String type,
      @RequestParam(required = false) String exclude,
      @RequestParam(required = false) String resumeId) {
    return writingService.generateWritingQuestion(type, exclude, resumeId);
  }

  @PostMapping("/score")
  public ScoreResult scoreAnswer(@RequestBody ScoreRequest request) {
    return writingService.scoreAnswer(request);
  }

  @GetMapping("/history")
  public List<WritingHistoryItem> getHistory() {
    // 直近の200件まで(答案を含むので、全件を毎回読まない)
    return writingRecordRepository.findTop200ByUserIdOrderByCreatedAtDesc(currentUserProvider.getCurrentUserId())
        .stream()
        .map(WritingHistoryItem::from)
        .toList();
  }
}