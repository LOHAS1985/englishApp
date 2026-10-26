package com.example.backend.grammar;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.dto.GrammarAnswerRequest;
import com.example.backend.grammar.dto.GrammarAnswerResult;
import com.example.backend.grammar.dto.GrammarHistoryItem;
import com.example.backend.grammar.dto.GrammarQuestion;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/grammar")
public class GrammarController {

  private final GrammarService grammarService;
  private final CurrentUserProvider currentUserProvider;
  private final GrammarRecordRepository grammarRecordRepository;

  public GrammarController(GrammarService grammarService,
      CurrentUserProvider currentUserProvider,
      GrammarRecordRepository grammarRecordRepository) {
    this.grammarService = grammarService;
    this.currentUserProvider = currentUserProvider;
    this.grammarRecordRepository = grammarRecordRepository;
  }

  @GetMapping("/question")
  public GrammarQuestion getQuestion(@RequestParam(required = false) String exclude) {
    return grammarService.generateQuestion(exclude);
  }

  @PostMapping("/answer")
  public GrammarAnswerResult answer(@RequestBody GrammarAnswerRequest request) {
    return grammarService.answer(request);
  }

  @GetMapping("/history")
  public List<GrammarHistoryItem> getHistory() {
    return grammarRecordRepository.findByUserIdOrderByCreatedAtDesc(currentUserProvider.getCurrentUserId())
        .stream()
        .map(GrammarHistoryItem::from)
        .toList();
  }
}