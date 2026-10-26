package com.example.backend.common;

import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.common.QuestionSetBank.SetQuestion;
import com.example.backend.config.CurrentUserProvider;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/** セット問題の出題(正解を隠した形への変換)と採点・記録。リーディングとリスニングで共通 */
@Service
public class QuestionSetPractice {

  /** 解答前に画面へ渡す形。正解・解説・リスニングの台本は含めない */
  public record QuestionSetView(
      String id,
      String type,
      String title,
      String passage,
      String situation,
      List<SetQuestionView> questions) {
  }

  public record SetQuestionView(String question, List<String> choices) {
  }

  public record SetAnswerRequest(String setId, List<String> answers) {
  }

  public record SetQuestionResult(boolean correct, String selected, String answer, String explanation) {
  }

  public record SetAnswerResult(
      int score,
      int total,
      List<SetQuestionResult> results,
      String script,
      String translation) {
  }

  private final PracticeRecordRepository recordRepository;
  private final CurrentUserProvider currentUserProvider;
  private final QuestionSelector questionSelector;

  public QuestionSetPractice(PracticeRecordRepository recordRepository, CurrentUserProvider currentUserProvider,
      QuestionSelector questionSelector) {
    this.recordRepository = recordRepository;
    this.currentUserProvider = currentUserProvider;
    this.questionSelector = questionSelector;
  }

  /** 解答履歴をもとに次のセットを選ぶ。exclude は画面に表示中のセットの ID */
  public QuestionSetView next(QuestionSetBank bank, String feature, String type, String exclude) {
    String id = questionSelector.pick(feature, bank.ids(type), exclude);
    return toView(bank.findById(id).orElseThrow());
  }

  public QuestionSetView toView(QuestionSet set) {
    List<SetQuestionView> questions = set.questions().stream()
        .map(q -> new SetQuestionView(q.question(), q.choices()))
        .toList();
    return new QuestionSetView(set.id(), set.type(), set.title(), set.passage(), set.situation(), questions);
  }

  /** 採点し、設問ごとに記録を保存する */
  public SetAnswerResult grade(QuestionSetBank bank, String feature, SetAnswerRequest request) {
    QuestionSet set = bank.findById(request.setId())
        .orElseThrow(() -> new IllegalArgumentException("問題が見つかりません。再度出題してください。"));
    List<String> answers = request.answers() == null ? List.of() : request.answers();
    Long userId = currentUserProvider.getCurrentUserId();

    List<SetQuestionResult> results = new ArrayList<>();
    int score = 0;
    for (int i = 0; i < set.questions().size(); i++) {
      SetQuestion q = set.questions().get(i);
      String selected = i < answers.size() && answers.get(i) != null ? answers.get(i).trim().toUpperCase() : "";
      boolean correct = q.answer().equalsIgnoreCase(selected);
      if (correct)
        score++;
      results.add(new SetQuestionResult(correct, selected, q.answer(), q.explanation()));
      recordRepository.save(new PracticeRecord(userId, feature, set.id(), i + 1,
            selected.isEmpty() ? null : selected, correct));
    }
    return new SetAnswerResult(score, set.questions().size(), results, set.script(), set.translation());
  }
}
