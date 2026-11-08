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
  /**
   * @param difficulty 1=基礎 / 2=標準 / 3=発展
   * @param theme      話題(英検の長文・説明文のみ。無ければ null)
   */
  public record QuestionSetView(
      String id,
      String type,
      String title,
      String passage,
      String situation,
      String graphic,
      List<SetQuestionView> questions,
      int difficulty,
      String theme) {
  }

  public record SetQuestionView(String question, List<String> choices) {
  }

  /**
   * @param durationSeconds 出題から解答までの秒数(学習時間の記録用)
   * @param readingSeconds  読解速度の計測で「本文を読み終えるまで」の秒数。計測していなければ null
   */
  public record SetAnswerRequest(String setId, List<String> answers, Integer durationSeconds, Integer readingSeconds) {
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

  /** 問いかけと選択肢が音声だけの形式か(解答前に文字を渡さないための判定。模試も同じ判定を使う) */
  public static boolean isAudioOnly(String type) {
    return AUDIO_ONLY_TYPES.contains(type);
  }

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

  /**
   * 解答履歴をもとに次のセットを選ぶ。
   *
   * @param exclude 画面に表示中のセットの ID
   * @param level   画面で選んだ難易度(1〜3)。null なら直近の正答率に合わせて自動で選ぶ
   */
  public QuestionSetView next(QuestionSetBank bank, String feature, String type, String exclude, Integer level) {
    String id = questionSelector.pick(feature, bank.ids(type), exclude, bank::difficulty, level);
    return toView(bank, bank.findById(id).orElseThrow());
  }

  public QuestionSetView toView(QuestionSetBank bank, QuestionSet set) {
    boolean audioOnly = isAudioOnly(set.type());
    List<SetQuestionView> questions = set.questions().stream()
        .map(q -> audioOnly
            ? new SetQuestionView("", q.choices().stream().map(c -> "").toList())
            : new SetQuestionView(q.question(), q.choices()))
        .toList();
    return new QuestionSetView(set.id(), set.type(), set.title(), set.passage(), set.situation(), set.graphic(),
        questions, bank.difficulty(set.id()), set.theme());
  }

  /** 採点し、設問ごとに記録を保存する */
  public SetAnswerResult grade(QuestionSetBank bank, String feature, SetAnswerRequest request) {
    QuestionSet set = bank.findById(request.setId())
        .orElseThrow(() -> new IllegalArgumentException("問題が見つかりません。再度出題してください。"));
    List<SetQuestionResult> results = scoreAndRecord(feature, set, request.answers());
    int score = (int) results.stream().filter(SetQuestionResult::correct).count();
    studyLogService.log(feature, set.type(), set.id(), score, set.questions().size(), request.durationSeconds());
    return new SetAnswerResult(score, set.questions().size(), results, set.script(), set.translation());
  }

  /**
   * 設問ごとに採点し、解答記録(PracticeRecord)を保存する。学習ログは書かない(模試は区切りごとに別に書く)。
   * 解答が足りない設問は未解答(selected 無し・不正解)として扱う。
   */
  public List<SetQuestionResult> scoreAndRecord(String feature, QuestionSet set, List<String> answers) {
    List<String> given = answers == null ? List.of() : answers;
    Long userId = currentUserProvider.getCurrentUserId();
    List<SetQuestionResult> results = new ArrayList<>();
    for (int i = 0; i < set.questions().size(); i++) {
      SetQuestion q = set.questions().get(i);
      String selected = i < given.size() && given.get(i) != null ? given.get(i).trim().toUpperCase() : "";
      boolean correct = q.answer().equalsIgnoreCase(selected);
      results.add(new SetQuestionResult(correct, selected, q.answer(), q.explanation()));
      recordRepository.save(new PracticeRecord(userId, feature, set.id(), i + 1,
            selected.isEmpty() ? null : selected, correct));
    }
    return results;
  }
}
