package com.example.backend.common;

import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.common.QuestionSetBank.SetQuestion;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.stats.StudyLogService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

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
      String graphic,
      List<SetQuestionView> questions) {
  }

  public record SetQuestionView(String question, List<String> choices) {
  }

  /** @param durationSeconds 出題から解答までの秒数(学習時間の記録用) */
  public record SetAnswerRequest(String setId, List<String> answers, Integer durationSeconds) {
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

  /** 問いかけと選択肢を音声だけで出す形式(TOEIC Part 2)。解答前は文字を渡さない */
  private static final Set<String> AUDIO_ONLY_TYPES = Set.of("toeic-part2");

  private final PracticeRecordRepository recordRepository;
  private final CurrentUserProvider currentUserProvider;
  private final QuestionSelector questionSelector;
  private final StudyLogService studyLogService;

  public QuestionSetPractice(PracticeRecordRepository recordRepository, CurrentUserProvider currentUserProvider,
      QuestionSelector questionSelector, StudyLogService studyLogService) {
    this.recordRepository = recordRepository;
    this.currentUserProvider = currentUserProvider;
    this.questionSelector = questionSelector;
    this.studyLogService = studyLogService;
  }

  /** 解答履歴をもとに次のセットを選ぶ。exclude は画面に表示中のセットの ID */
  public QuestionSetView next(QuestionSetBank bank, String feature, String type, String exclude) {
    String id = questionSelector.pick(feature, bank.ids(type), exclude);
    return toView(bank.findById(id).orElseThrow());
  }

  public QuestionSetView toView(QuestionSet set) {
    boolean audioOnly = AUDIO_ONLY_TYPES.contains(set.type());
    List<SetQuestionView> questions = set.questions().stream()
        .map(q -> audioOnly
            ? new SetQuestionView("", q.choices().stream().map(c -> "").toList())
            : new SetQuestionView(q.question(), q.choices()))
        .toList();
    return new QuestionSetView(set.id(), set.type(), set.title(), set.passage(), set.situation(), set.graphic(),
        questions);
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
    studyLogService.log(feature, set.type(), set.id(), score, set.questions().size(), request.durationSeconds());
    return new SetAnswerResult(score, set.questions().size(), results, set.script(), set.translation());
  }
}
