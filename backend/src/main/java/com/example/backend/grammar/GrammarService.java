package com.example.backend.grammar;

import com.example.backend.common.QuestionSelector;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.grammar.dto.GrammarAnswerRequest;
import com.example.backend.grammar.dto.GrammarAnswerResult;
import com.example.backend.grammar.dto.GrammarChoice;
import com.example.backend.grammar.dto.GrammarQuestion;
import com.example.backend.review.ReviewService;
import com.example.backend.stats.StudyLogService;
import org.springframework.stereotype.Service;

import java.util.List;

/** TOEIC Part 5 形式の文法問題を、リポジトリ内の問題集(GrammarQuestionBank)から出題・採点する */
@Service
public class GrammarService {

  private final GrammarQuestionBank questionBank;
  private final GrammarRecordRepository grammarRecordRepository;
  private final CurrentUserProvider currentUserProvider;
  private final QuestionSelector questionSelector;
  private final StudyLogService studyLogService;
  private final ReviewService reviewService;

  public GrammarService(GrammarQuestionBank questionBank,
      GrammarRecordRepository grammarRecordRepository,
      CurrentUserProvider currentUserProvider,
      QuestionSelector questionSelector,
      StudyLogService studyLogService,
      ReviewService reviewService) {
    this.questionBank = questionBank;
    this.grammarRecordRepository = grammarRecordRepository;
    this.currentUserProvider = currentUserProvider;
    this.questionSelector = questionSelector;
    this.studyLogService = studyLogService;
    this.reviewService = reviewService;
  }

  /**
   * @param exclude 画面に表示中の問題の ID(先読みで同じ問題を選ばないため)
   * @param review  true なら復習日が来た間違えた問題から出す
   */
  public GrammarQuestion generateQuestion(String exclude, boolean review) {
    String id = review
        ? reviewService.pickDue("grammar", exclude)
        : questionSelector.pick("grammar", questionBank.ids(), exclude);
    ChoiceQuestion q = questionBank.findById(id).orElseThrow();
    return new GrammarQuestion(q.id(), q.sentence(), q.choices());
  }

  public GrammarAnswerResult answer(GrammarAnswerRequest request) {
    ChoiceQuestion q = questionBank.findById(request.getQuestionId())
        .orElseThrow(() -> new IllegalArgumentException("問題が見つかりません。再度出題してください。"));

    boolean isCorrect = q.answer().equalsIgnoreCase(request.getSelectedChoice());

    GrammarRecord record = new GrammarRecord();
    record.setUserId(currentUserProvider.getCurrentUserId());
    record.setQuestionId(q.id());
    record.setSentence(q.sentence());
    record.setChoiceA(textFor(q.choices(), "A"));
    record.setChoiceB(textFor(q.choices(), "B"));
    record.setChoiceC(textFor(q.choices(), "C"));
    record.setChoiceD(textFor(q.choices(), "D"));
    record.setCorrectChoice(q.answer());
    record.setSelectedChoice(request.getSelectedChoice());
    record.setCorrect(isCorrect);
    record.setExplanation(q.explanation());
    record.setTranslation(q.translation());
    grammarRecordRepository.save(record);
    studyLogService.log("grammar", "toeic-part5", q.id(), isCorrect ? 1 : 0, 1, request.getDurationSeconds());
    reviewService.record("grammar", q.id(), isCorrect);

    return new GrammarAnswerResult(isCorrect, q.answer(), q.explanation(), q.translation());
  }

  private String textFor(List<GrammarChoice> choices, String label) {
    return choices.stream()
        .filter(c -> c.label().equals(label))
        .findFirst()
        .map(GrammarChoice::text)
        .orElse("");
  }
}
