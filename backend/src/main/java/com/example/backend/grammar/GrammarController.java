package com.example.backend.grammar;

import com.example.backend.grammar.dto.GrammarAnswerRequest;
import com.example.backend.grammar.dto.GrammarAnswerResult;
import com.example.backend.grammar.dto.GrammarQuestion;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/grammar")
public class GrammarController {

  private final GrammarService grammarService;

  public GrammarController(GrammarService grammarService) {
    this.grammarService = grammarService;
  }

  /**
   * 復習の出題(復習日になった間違えた問題)。通常の出題は画面が同梱の問題集から行う(api/localQuestions.ts)。
   * 画面は ?review=true を付けて呼ぶ(付けなくても復習から出す)
   */
  @GetMapping("/question")
  public GrammarQuestion getQuestion(@RequestParam(required = false) String exclude) {
    return grammarService.reviewQuestion(exclude);
  }

  @PostMapping("/answer")
  public GrammarAnswerResult answer(@RequestBody GrammarAnswerRequest request) {
    return grammarService.answer(request);
  }
}