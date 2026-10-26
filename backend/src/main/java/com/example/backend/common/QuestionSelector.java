package com.example.backend.common;

import com.example.backend.common.QuestionPicker.Attempt;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.GrammarRecordRepository;
import com.example.backend.writing.WritingRecordRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

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
