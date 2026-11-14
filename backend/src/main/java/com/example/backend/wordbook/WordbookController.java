package com.example.backend.wordbook;

import com.example.backend.wordbook.dto.AddWordRequest;
import com.example.backend.wordbook.dto.AddWordResponse;
import com.example.backend.wordbook.dto.AnswerResultView;
import com.example.backend.wordbook.dto.ChoiceAnswerRequest;
import com.example.backend.wordbook.dto.ChoiceQuestionView;
import com.example.backend.wordbook.dto.ColorRequest;
import com.example.backend.wordbook.dto.FillAnswerRequest;
import com.example.backend.wordbook.dto.FillQuestionView;
import com.example.backend.wordbook.dto.HistoryItem;
import com.example.backend.wordbook.dto.MeaningRequest;
import com.example.backend.wordbook.dto.SummaryView;
import com.example.backend.wordbook.dto.WordView;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/** 単語帳。登録・一覧・色は WordbookService、出題と採点は WordbookQuizService に任せる */
@RestController
@RequestMapping("/api/wordbook")
public class WordbookController {

  private final WordbookService wordService;
  private final WordbookQuizService quizService;

  public WordbookController(WordbookService wordService, WordbookQuizService quizService) {
    this.wordService = wordService;
    this.quizService = quizService;
  }

  @GetMapping("/summary")
  public SummaryView summary() {
    return wordService.summary();
  }

  @GetMapping("/words")
  public List<WordView> words(@RequestParam(required = false) String color,
      @RequestParam(required = false) String q) {
    WordbookColor parsed = color == null || color.isBlank() ? null : WordbookService.parseColor(color);
    return wordService.list(parsed, q);
  }

  @PostMapping("/words")
  public AddWordResponse addWord(@RequestBody AddWordRequest request) {
    return wordService.add(request.word(), request.exampleEn(), request.exampleAnswer());
  }

  @PutMapping("/words/{id}/color")
  public WordView setColor(@PathVariable Long id, @RequestBody ColorRequest request) {
    return wordService.setColor(id, request.color());
  }

  @PutMapping("/words/{id}")
  public WordView setMeaning(@PathVariable Long id, @RequestBody MeaningRequest request) {
    return wordService.setMeaning(id, request.meaningJa());
  }

  @DeleteMapping("/words/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    wordService.delete(id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/quiz/choice")
  public ChoiceQuestionView choiceQuestion(@RequestParam(required = false) String exclude) {
    return quizService.choiceQuestion(parseIds(exclude));
  }

  @PostMapping("/quiz/choice/answer")
  public AnswerResultView answerChoice(@RequestBody ChoiceAnswerRequest request) {
    return quizService.answerChoice(request);
  }

  @GetMapping("/quiz/fill")
  public FillQuestionView fillQuestion(@RequestParam(required = false) String exclude) {
    return quizService.fillQuestion(parseIds(exclude));
  }

  @PostMapping("/quiz/fill/answer")
  public AnswerResultView answerFill(@RequestBody FillAnswerRequest request) {
    return quizService.answerFill(request);
  }

  @GetMapping("/history")
  public List<HistoryItem> history() {
    return quizService.history();
  }

  /** 画面で直近に出した語の ID(カンマ区切り)。同じ語が続けて出ないようにする */
  private static Set<Long> parseIds(String exclude) {
    if (exclude == null || exclude.isBlank()) {
      return Set.of();
    }
    return Arrays.stream(exclude.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .map(Long::valueOf)
        .collect(Collectors.toSet());
  }
}
