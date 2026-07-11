package com.example.backend.grammar;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.user.User;
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
  public GrammarQuestion getQuestion() {
    return grammarService.generateQuestion();
  }

  @PostMapping("/answer")
  public GrammarAnswerResult answer(@RequestBody GrammarAnswerRequest request) {
    return grammarService.answer(request);
  }

  @GetMapping("/history")
  public List<GrammarHistoryItem> getHistory() {
    User user = currentUserProvider.getCurrentUser();
    return grammarRecordRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
        .stream()
        .map(GrammarHistoryItem::from)
        .toList();
  }
}