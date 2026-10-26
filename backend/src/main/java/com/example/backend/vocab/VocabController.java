package com.example.backend.vocab;

import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.common.PracticeRecord;
import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.dto.GrammarAnswerRequest;
import com.example.backend.grammar.dto.GrammarAnswerResult;
import com.example.backend.grammar.dto.GrammarQuestion;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 語彙問題(4択の短文空所補充)。出題・採点の形は文法問題と同じ */
@RestController
@RequestMapping("/api/vocab")
public class VocabController {

  private final VocabQuestionBank questionBank;
  private final PracticeRecordRepository recordRepository;
  private final CurrentUserProvider currentUserProvider;

  public VocabController(VocabQuestionBank questionBank, PracticeRecordRepository recordRepository,
      CurrentUserProvider currentUserProvider) {
    this.questionBank = questionBank;
    this.recordRepository = recordRepository;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping("/question")
  public GrammarQuestion getQuestion() {
    ChoiceQuestion q = questionBank.random();
    return new GrammarQuestion(q.id(), q.sentence(), q.choices());
  }

  @PostMapping("/answer")
  public ResponseEntity<?> answer(@RequestBody GrammarAnswerRequest request) {
    ChoiceQuestion q = questionBank.findById(request.getQuestionId()).orElse(null);
    if (q == null) {
      return ResponseEntity.status(404).body(Map.of("error", "問題が見つかりません。再度出題してください。"));
    }
    String selected = request.getSelectedChoice() == null ? "" : request.getSelectedChoice().trim().toUpperCase();
    boolean correct = q.answer().equals(selected);
    currentUserProvider.findCurrentUser().ifPresent(user -> recordRepository.save(
        new PracticeRecord(user.getId(), "vocab", q.id(), 1, selected.isEmpty() ? null : selected, correct)));
    return ResponseEntity.ok(new GrammarAnswerResult(correct, q.answer(), q.explanation(), q.translation()));
  }
}
