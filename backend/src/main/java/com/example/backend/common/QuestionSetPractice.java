package com.example.backend.common;

import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.common.QuestionSetBank.SetQuestion;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.review.ReviewService;
import com.example.backend.stats.StudyLogService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
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
   * @param clientRequestId 画面の送信待ちの列が付ける解答ごとの ID。再送で二重に保存しないために使う(無ければ null)
   * @param answeredAt      解いた時刻。送信が遅れても、解いた日に数えるために使う(無ければ受信時刻)
   */
  public record SetAnswerRequest(String setId, List<String> answers, Integer durationSeconds, Integer readingSeconds,
      String clientRequestId, Instant answeredAt) {
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
  private final ReviewService reviewService;

  public QuestionSetPractice(PracticeRecordRepository recordRepository, CurrentUserProvider currentUserProvider,
      QuestionSelector questionSelector, StudyLogService studyLogService, ReviewService reviewService) {
    this.recordRepository = recordRepository;
    this.currentUserProvider = currentUserProvider;
    this.questionSelector = questionSelector;
    this.studyLogService = studyLogService;
    this.reviewService = reviewService;
  }

  /** 復習の対象にする機能(間違えた設問を、間隔を置いて出し直す) */
  static final List<String> REVIEW_FEATURES = List.of("reading", "listening");

  /**
   * 復習日になっている設問を含むセットの ID(復習日が古い順)。表示中のセット(exclude)以外を返す。
   * @throws IllegalArgumentException 今日の復習がもう無いとき
   */
  public String dueSetId(QuestionSetBank bank, String feature, String exclude) {
    return reviewService.dueIds(feature).stream()
        .map(QuestionSetPractice::setIdOf)
        .filter(id -> !id.equals(exclude))
        .filter(id -> bank.findById(id).isPresent())
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("今日の復習はすべて終わりました"));
  }

  /** 復習の item_id(セットID-設問番号)からセットIDを取り出す */
  public static String setIdOf(String reviewItemId) {
    int dash = reviewItemId.lastIndexOf('-');
    return dash < 0 ? reviewItemId : reviewItemId.substring(0, dash);
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

  /** この解答を、すでに保存したか(画面の送信待ちの列が再送したとき)。保存済みなら記録を追加しない */
  public boolean isDuplicate(SetAnswerRequest request) {
    return studyLogService.isRecorded(request.clientRequestId());
  }

  /**
   * 採点し、設問ごとに記録を保存する。記録・学習ログを1つのトランザクションにする
   * (途中で失敗して一部だけ保存されると、再送で重複するため)。
   * すでに保存した解答(同じ clientRequestId の再送)は、記録を追加せず採点結果だけ返す。
   */
  @Transactional
  public SetAnswerResult grade(QuestionSetBank bank, String feature, SetAnswerRequest request) {
    QuestionSet set = bank.findById(request.setId())
        .orElseThrow(() -> new QuestionNotFoundException("問題が見つかりません。再度出題してください。"));
    boolean duplicate = isDuplicate(request);
    LocalDateTime answeredAt = StudyLogService.answeredAt(request.answeredAt());
    List<SetQuestionResult> results = duplicate
        ? score(set, request.answers())
        : scoreAndRecord(feature, set, request.answers());
    int score = (int) results.stream().filter(SetQuestionResult::correct).count();
    if (!duplicate) {
      studyLogService.log(feature, set.type(), set.id(), score, set.questions().size(), request.durationSeconds(),
          request.clientRequestId(), answeredAt);
    }
    return new SetAnswerResult(score, set.questions().size(), results, set.script(), set.translation());
  }

  /**
   * 設問ごとに採点し、解答記録(PracticeRecord)を保存する。学習ログは書かない(模試は区切りごとに別に書く)。
   * 解答が足りない設問は未解答(selected 無し・不正解)として扱う。
   */
  public List<SetQuestionResult> scoreAndRecord(String feature, QuestionSet set, List<String> answers) {
    Long userId = currentUserProvider.getCurrentUserId();
    List<SetQuestionResult> results = score(set, answers);
    for (int i = 0; i < results.size(); i++) {
      String selected = results.get(i).selected();
      recordRepository.save(new PracticeRecord(userId, feature, set.id(), i + 1,
            selected.isEmpty() ? null : selected, results.get(i).correct()));
      // 間違えた設問は復習に登録する(正解すると、復習の間隔が延びる・覚えたら外れる)
      if (REVIEW_FEATURES.contains(feature)) {
        reviewService.record(feature, set.id() + "-" + (i + 1), results.get(i).correct(),
            LocalDateTime.now(StudyLogService.JST));
      }
    }
    return results;
  }

  /** 設問ごとの採点だけを行う(保存しない) */
  private static List<SetQuestionResult> score(QuestionSet set, List<String> answers) {
    List<String> given = answers == null ? List.of() : answers;
    List<SetQuestionResult> results = new ArrayList<>();
    for (int i = 0; i < set.questions().size(); i++) {
      SetQuestion q = set.questions().get(i);
      String selected = i < given.size() && given.get(i) != null ? given.get(i).trim().toUpperCase() : "";
      results.add(new SetQuestionResult(q.answer().equalsIgnoreCase(selected), selected, q.answer(), q.explanation()));
    }
    return results;
  }
}
