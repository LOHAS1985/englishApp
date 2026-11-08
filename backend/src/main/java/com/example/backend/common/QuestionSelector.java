package com.example.backend.common;

import com.example.backend.common.QuestionPicker.Attempt;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.GrammarRecordRepository;
import com.example.backend.writing.WritingRecordRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.ToIntFunction;

/** 各機能の解答記録を読み、{@link QuestionPicker} で次に出す問題を選ぶ */
@Service
public class QuestionSelector {

  /** ライティングはこの点数(16点満点)未満を「復習が必要」とみなす */
  static final int WRITING_PASS_SCORE = 10;

  private final PracticeRecordRepository practiceRecordRepository;
  private final GrammarRecordRepository grammarRecordRepository;
  private final WritingRecordRepository writingRecordRepository;
  private final CurrentUserProvider currentUserProvider;

  public QuestionSelector(PracticeRecordRepository practiceRecordRepository,
      GrammarRecordRepository grammarRecordRepository,
      WritingRecordRepository writingRecordRepository,
      CurrentUserProvider currentUserProvider) {
    this.practiceRecordRepository = practiceRecordRepository;
    this.grammarRecordRepository = grammarRecordRepository;
    this.writingRecordRepository = writingRecordRepository;
    this.currentUserProvider = currentUserProvider;
  }

  /**
   * @param feature    grammar / vocab / reading / listening / writing / speaking
   * @param candidates 出題候補の ID
   * @param exclude    画面に表示中の問題の ID(続けて出さない)。null 可
   */
  public String pick(String feature, List<String> candidates, String exclude) {
    return QuestionPicker.pick(candidates, history(feature), exclude, ThreadLocalRandom.current());
  }

  /**
   * 難易度を考慮して選ぶ。
   *
   * @param difficulty 問題 ID → 難易度(1〜5)
   * @param level      画面で選んだ難易度(1〜5)。null なら自動(直近に解いた問題の難易度と正答率から目標を決める)
   */
  public String pick(String feature, List<String> candidates, String exclude, ToIntFunction<String> difficulty,
      Integer level) {
    if (level != null) {
      List<String> fixed = candidates.stream().filter(id -> difficulty.applyAsInt(id) == level).toList();
      if (fixed.isEmpty()) {
        throw new IllegalArgumentException("この難易度の問題はまだ登録されていません");
      }
      return QuestionPicker.pick(fixed, history(feature), exclude, ThreadLocalRandom.current());
    }
    Integer target = Difficulty.target(recentAnswers(feature, candidates, difficulty));
    return QuestionPicker.pick(candidates, history(feature), exclude, ThreadLocalRandom.current(), difficulty,
        target);
  }

  /**
   * 候補の問題に対する直近の設問ごとの難易度と正誤(新しい順)。セット問題は全問正解かどうかではなく設問単位で見る
   * (3問中2問正解を「不正解」と数えると、目標の難易度が下がりすぎるため)。
   */
  private List<Difficulty.Answer> recentAnswers(String feature, List<String> candidates,
      ToIntFunction<String> difficulty) {
    Long userId = currentUserProvider.getCurrentUserId();
    Set<String> candidateSet = new HashSet<>(candidates);
    if ("grammar".equals(feature)) {
      return grammarRecordRepository.findByUserIdOrderByIdDesc(userId).stream()
          .filter(r -> candidateSet.contains(r.getQuestionId()))
          .limit(Difficulty.RECENT_ANSWERS)
          .map(r -> new Difficulty.Answer(difficulty.applyAsInt(r.getQuestionId()), r.isCorrect()))
          .toList();
    }
    return practiceRecordRepository.findByUserIdAndFeatureOrderByIdDesc(userId, feature).stream()
        .filter(r -> r.getCorrect() != null && candidateSet.contains(r.getItemId()))
        .limit(Difficulty.RECENT_ANSWERS)
        .map(r -> new Difficulty.Answer(difficulty.applyAsInt(r.getItemId()), r.getCorrect()))
        .toList();
  }

  /** 画面側で出題するための解答履歴1行(設問ごと。新しい順) */
  public record AnswerRow(String itemId, int questionNo, Boolean correct) {
  }

  /** 画面側で出題を選ぶ機能(問題集を画面に同梱しているもの) */
  static final Set<String> CLIENT_PICK_FEATURES = Set.of("grammar", "vocab", "reading", "listening");

  /**
   * 画面側の出題(QuestionPicker の移植)に使う解答履歴。画面はこれをブラウザに保存しておき、
   * サーバーの起動を待たずに次の問題を選ぶ。
   */
  public List<AnswerRow> answerRows(String feature) {
    if (!CLIENT_PICK_FEATURES.contains(feature)) {
      throw new IllegalArgumentException("この機能の履歴は取得できません: " + feature);
    }
    Long userId = currentUserProvider.getCurrentUserId();
    if ("grammar".equals(feature)) {
      return grammarRecordRepository.findByUserIdOrderByIdDesc(userId).stream()
          .filter(r -> r.getQuestionId() != null)
          .map(r -> new AnswerRow(r.getQuestionId(), 1, r.isCorrect()))
          .toList();
    }
    return practiceRecordRepository.findByUserIdAndFeatureOrderByIdDesc(userId, feature).stream()
        .map(r -> new AnswerRow(r.getItemId(), r.getQuestionNo(), r.getCorrect()))
        .toList();
  }

  /** 解答履歴(新しい順) */
  private List<Attempt> history(String feature) {
    Long userId = currentUserProvider.getCurrentUserId();
    return switch (feature) {
      case "grammar" -> grammarRecordRepository.findByUserIdOrderByIdDesc(userId).stream()
          .filter(r -> r.getQuestionId() != null)
          .map(r -> new Attempt(r.getQuestionId(), r.isCorrect()))
          .toList();
      case "writing" -> writingRecordRepository.findByUserIdOrderByIdDesc(userId).stream()
          // prompt 列は "opinion:w0003" のように形式とお題IDを保存している
          .filter(r -> r.getPrompt() != null && r.getPrompt().contains(":"))
          .map(r -> new Attempt(r.getPrompt().substring(r.getPrompt().indexOf(':') + 1),
              r.getTotalScore() >= WRITING_PASS_SCORE))
          .toList();
      default -> practiceAttempts(practiceRecordRepository.findByUserIdAndFeatureOrderByIdDesc(userId, feature));
    };
  }

  /**
   * practice_records は設問1つにつき1行。セット問題は1回の解答で設問1から順に保存されるので、
   * 新しい順に読んで設問1の行で1回分を区切り、全問正解なら正解とする。
   */
  static List<Attempt> practiceAttempts(List<PracticeRecord> rowsNewestFirst) {
    List<Attempt> attempts = new ArrayList<>();
    Boolean allCorrect = null;
    for (PracticeRecord r : rowsNewestFirst) {
      if (r.getCorrect() != null) {
        allCorrect = (allCorrect == null || allCorrect) && r.getCorrect();
      }
      if (r.getQuestionNo() == 1) {
        attempts.add(new Attempt(r.getItemId(), allCorrect));
        allCorrect = null;
      }
    }
    return attempts;
  }
}
